# Reference

# Providing Effective Context

## What Context Helps

When asking Claude for help with Symfony, provide:

1. **Relevant code files** - Entity, Service, Controller involved
2. **Error messages** - Full stack trace if available
3. **Symfony version** - 8.x (stable), 7.4 LTS, or 6.4 legacy LTS
4. **Installed bundles** - API Platform, Messenger, etc.
5. **Constraints** - Performance requirements, backward compatibility

## Code Context Examples

### For Entity Questions

Provide:
```
- The entity file
- Related entities (if relationships involved)
- The repository if custom queries
- Current migration state
```

### For API Platform Questions

Provide:
```
- Entity with API Platform attributes
- Custom providers/processors if any
- Relevant filters
- Expected request/response format
```

### For Testing Questions

Provide:
```
- Test file
- Code being tested
- Factory files
- Error output
```

## Effective Prompts

### Good: Specific and Contextual

```
I have a Symfony 7 app with API Platform 4. I need to add a filter
that searches across multiple fields (title, description, author name).

Here's my entity:
[paste entity code]

Current filters work for single fields. How do I create a custom
filter that does OR search across these fields?
```

### Bad: Vague and Missing Context

```
How do I search in API Platform?
```

## Including Error Context

### Full Error Message

```
When I run bin/console doctrine:migrations:migrate, I get:

[Error message with full stack trace]

My entity is:
[entity code]

My migration is:
[migration code]
```

### Relevant Log Output

```
The Messenger worker crashes with this error in var/log/dev.log:

[2024-01-15 10:30:00] messenger.ERROR: Error thrown while handling message...

My message handler:
[handler code]

My message:
[message code]
```

## Constraints to Mention

### Performance Requirements

```
This endpoint needs to handle 1000 requests/second. Currently it's slow
because of N+1 queries. Here's the code:
[code]
```

### Backward Compatibility

```
I need to add a new field to the API response without breaking existing
clients. Current response format:
[JSON example]
```

### Existing Patterns

```
Our codebase uses CQRS pattern. Here's an example command handler:
[example code]

I need to add a new feature following the same pattern.
```

## Project Structure Context

### When Asking About Architecture

```
Our project structure:
src/
├── Domain/       # Entities, Value Objects
├── Application/  # Commands, Queries, Handlers
└── Infrastructure/  # Controllers, Repositories

We follow hexagonal architecture. How should I structure a new
feature for user notifications?
```

### When Asking About Configuration

```
config/packages/messenger.yaml:
[current config]

I need to add a second transport for high-priority messages.
```

## Version-Specific Context

### Symfony Version

```
Symfony 6.4 LTS project. Can I use MapRequestPayload attribute?
Or is that only in 7.x?
```

### PHP Version

```
PHP 8.2, Symfony 7.1. I want to use readonly classes for my DTOs.
```

### Bundle Versions

```
API Platform 3.2. I see examples using "operations" but my version
uses "collectionOperations". Which syntax should I use?
```

## Anti-Patterns to Avoid

### Don't Provide Too Much

```
# Bad: dumping entire project
Here's my entire src/ directory...
[thousands of lines]
```

### Don't Provide Too Little

```
# Bad: no context
Why doesn't my query work?
```

### Don't Assume Knowledge

```
# Bad: referring to unseen code
The UserService I showed you earlier...
[But it wasn't shown]
```

## Template for Asking Questions

```markdown
## Context
- Symfony version: X.Y
- PHP version: 8.X
- Relevant bundles: [list]

## What I'm Trying to Do
[Clear description of goal]

## Current Code
[Relevant files only]

## What's Happening
[Error message or unexpected behavior]

## What I've Tried
[Previous attempts if any]

## Constraints
[Performance, compatibility, patterns to follow]
```


## Skill Operating Checklist

### Design checklist
- Confirm operation boundaries and invariants first.
- Minimize scope while preserving contract correctness.
- Test both happy path and negative path behavior.

### Validation commands
- rg --files
- composer validate
- ./vendor/bin/phpstan analyse

### Failure modes to test
- Invalid payload or forbidden actor.
- Boundary values / not-found cases.
- Retry or partial-failure behavior for async flows.

