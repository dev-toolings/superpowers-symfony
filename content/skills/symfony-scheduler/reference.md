# Reference

# Symfony Scheduler

Available in Symfony 7.1+ as a native component.

## Installation

```bash
composer require symfony/scheduler
```

## Basic Schedule

### Define a Schedule

```php
<?php
// src/Scheduler/DefaultScheduleProvider.php

namespace App\Scheduler;

use App\Message\CleanupExpiredSessions;
use App\Message\GenerateDailyReport;
use App\Message\SyncInventory;
use Symfony\Component\Scheduler\Attribute\AsSchedule;
use Symfony\Component\Scheduler\RecurringMessage;
use Symfony\Component\Scheduler\Schedule;
use Symfony\Component\Scheduler\ScheduleProviderInterface;

#[AsSchedule('default')]
class DefaultScheduleProvider implements ScheduleProviderInterface
{
    public function getSchedule(): Schedule
    {
        return (new Schedule())
            // Every 5 minutes
            ->add(RecurringMessage::every('5 minutes', new SyncInventory()))

            // Daily at 2 AM
            ->add(RecurringMessage::every('1 day', new GenerateDailyReport())
                ->from(new \DateTimeImmutable('02:00')))

            // Every hour
            ->add(RecurringMessage::every('1 hour', new CleanupExpiredSessions()))

            // Cron expression
            ->add(RecurringMessage::cron('0 */6 * * *', new ProcessQueuedEmails()))
        ;
    }
}
```

### Message Classes

```php
<?php
// src/Message/GenerateDailyReport.php

namespace App\Message;

final class GenerateDailyReport
{
    public function __construct(
        public readonly ?\DateTimeImmutable $forDate = null,
    ) {}
}

// src/MessageHandler/GenerateDailyReportHandler.php

namespace App\MessageHandler;

use App\Message\GenerateDailyReport;
use Symfony\Component\Messenger\Attribute\AsMessageHandler;

#[AsMessageHandler]
class GenerateDailyReportHandler
{
    public function __invoke(GenerateDailyReport $message): void
    {
        $date = $message->forDate ?? new \DateTimeImmutable('yesterday');

        $this->reportService->generate($date);
        $this->logger->info('Daily report generated', ['date' => $date->format('Y-m-d')]);
    }
}
```

## Trigger Types

### Time-Based Triggers

```php
use Symfony\Component\Scheduler\RecurringMessage;
use Symfony\Component\Scheduler\Trigger\CronExpressionTrigger;

// Every X interval
RecurringMessage::every('5 minutes', new MyMessage())
RecurringMessage::every('1 hour', new MyMessage())
RecurringMessage::every('1 day', new MyMessage())
RecurringMessage::every('1 week', new MyMessage())

// Cron expressions
RecurringMessage::cron('*/5 * * * *', new MyMessage())  // Every 5 minutes
RecurringMessage::cron('0 * * * *', new MyMessage())    // Every hour
RecurringMessage::cron('0 0 * * *', new MyMessage())    // Daily at midnight
RecurringMessage::cron('0 0 * * 0', new MyMessage())    // Weekly on Sunday
RecurringMessage::cron('0 0 1 * *', new MyMessage())    // Monthly on 1st

// With timezone
RecurringMessage::cron('0 9 * * 1-5', new MyMessage())
    ->timezone(new \DateTimeZone('Europe/Paris'))

// Starting from specific time
RecurringMessage::every('1 day', new MyMessage())
    ->from(new \DateTimeImmutable('06:00'))

// Until specific time
RecurringMessage::every('1 hour', new MyMessage())
    ->until(new \DateTimeImmutable('2024-12-31'))
```

### Custom Trigger

```php
<?php
// src/Scheduler/Trigger/BusinessHoursTrigger.php

namespace App\Scheduler\Trigger;

use Symfony\Component\Scheduler\Trigger\TriggerInterface;

class BusinessHoursTrigger implements TriggerInterface
{
    public function __construct(
        private TriggerInterface $inner,
    ) {}

    public function __toString(): string
    {
        return 'business_hours(' . $this->inner . ')';
    }

    public function getNextRunDate(\DateTimeImmutable $run): ?\DateTimeImmutable
    {
        $next = $this->inner->getNextRunDate($run);

        if ($next === null) {
            return null;
        }

        // Skip weekends
        while ((int) $next->format('N') >= 6) {
            $next = $next->modify('+1 day')->setTime(9, 0);
        }

        // Only between 9 AM and 6 PM
        $hour = (int) $next->format('H');
        if ($hour < 9) {
            $next = $next->setTime(9, 0);
        } elseif ($hour >= 18) {
            $next = $next->modify('+1 day')->setTime(9, 0);
        }

        return $next;
    }
}
```

## Multiple Schedules

```php
<?php
// src/Scheduler/MaintenanceScheduleProvider.php

#[AsSchedule('maintenance')]
class MaintenanceScheduleProvider implements ScheduleProviderInterface
{
    public function getSchedule(): Schedule
    {
        return (new Schedule())
            ->add(RecurringMessage::cron('0 3 * * *', new DatabaseBackup()))
            ->add(RecurringMessage::cron('0 4 * * 0', new CleanupLogs()))
        ;
    }
}
```

Run specific schedule:

```bash
bin/console messenger:consume scheduler_maintenance
```

## Running the Scheduler

### As Messenger Transport

The scheduler creates a special transport:

```bash
# Run the default schedule
bin/console messenger:consume scheduler_default

# Run specific schedule
bin/console messenger:consume scheduler_maintenance

# With worker options
bin/console messenger:consume scheduler_default --time-limit=3600
```

### Supervisor Configuration

```ini
[program:scheduler]
command=php /var/www/app/bin/console messenger:consume scheduler_default --time-limit=3600
user=www-data
numprocs=1
autostart=true
autorestart=true
startretries=10
stderr_logfile=/var/log/scheduler.err.log
stdout_logfile=/var/log/scheduler.out.log
```

## Stateful Schedules

Track last run and prevent overlap:

```php
<?php

use Symfony\Component\Lock\LockFactory;
use Symfony\Component\Scheduler\Schedule;

#[AsSchedule('default')]
class DefaultScheduleProvider implements ScheduleProviderInterface
{
    public function __construct(
        private LockFactory $lockFactory,
        private CacheInterface $cache,
    ) {}

    public function getSchedule(): Schedule
    {
        return (new Schedule())
            ->stateful($this->cache)  // Remember last run times
            ->lock($this->lockFactory->createLock('scheduler'))  // Prevent overlap
            ->add(RecurringMessage::every('1 hour', new HeavyTask()))
        ;
    }
}
```

## Testing Schedules

```php
<?php

use Symfony\Component\Scheduler\RecurringMessage;

class ScheduleTest extends TestCase
{
    public function testDailyReportScheduledCorrectly(): void
    {
        $provider = new DefaultScheduleProvider();
        $schedule = $provider->getSchedule();

        $messages = $schedule->getRecurringMessages();

        // Find the daily report message
        $dailyReport = array_filter(
            iterator_to_array($messages),
            fn($m) => $m->getMessage() instanceof GenerateDailyReport
        );

        $this->assertCount(1, $dailyReport);

        // Check next run time
        $message = reset($dailyReport);
        $trigger = $message->getTrigger();
        $nextRun = $trigger->getNextRunDate(new \DateTimeImmutable());

        $this->assertEquals('02', $nextRun->format('H'));
    }
}
```

## Monitoring

```php
<?php
// src/EventSubscriber/SchedulerMonitoringSubscriber.php

use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\Scheduler\Event\PostRunEvent;
use Symfony\Component\Scheduler\Event\PreRunEvent;

class SchedulerMonitoringSubscriber implements EventSubscriberInterface
{
    public static function getSubscribedEvents(): array
    {
        return [
            PreRunEvent::class => 'onPreRun',
            PostRunEvent::class => 'onPostRun',
        ];
    }

    public function onPreRun(PreRunEvent $event): void
    {
        $this->logger->info('Starting scheduled task', [
            'message' => get_class($event->getMessage()),
        ]);
    }

    public function onPostRun(PostRunEvent $event): void
    {
        $this->logger->info('Completed scheduled task', [
            'message' => get_class($event->getMessage()),
            'duration' => $event->getDuration(),
        ]);
    }
}
```

## Best Practices

1. **Stateful schedules**: Use cache to track last run
2. **Lock heavy tasks**: Prevent overlapping executions
3. **Supervisor**: Use for production reliability
4. **Monitor execution**: Log start/end times
5. **Idempotent tasks**: Safe to re-run if needed
6. **Timezone awareness**: Be explicit about timezones


## Skill Operating Checklist

### Design checklist
- Confirm operation boundaries and invariants first.
- Minimize scope while preserving contract correctness.
- Test both happy path and negative path behavior.

### Validation commands
- php bin/console messenger:consume --limit=1
- php bin/console messenger:failed:show
- ./vendor/bin/phpunit --filter=Messenger

### Failure modes to test
- Invalid payload or forbidden actor.
- Boundary values / not-found cases.
- Retry or partial-failure behavior for async flows.

