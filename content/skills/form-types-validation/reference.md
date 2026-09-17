# Reference

# Symfony Forms and Validation

## Basic Form Type

```php
<?php
// src/Form/UserType.php

namespace App\Form;

use App\Entity\User;
use Symfony\Component\Form\AbstractType;
use Symfony\Component\Form\Extension\Core\Type\EmailType;
use Symfony\Component\Form\Extension\Core\Type\PasswordType;
use Symfony\Component\Form\Extension\Core\Type\RepeatedType;
use Symfony\Component\Form\Extension\Core\Type\TextType;
use Symfony\Component\Form\FormBuilderInterface;
use Symfony\Component\OptionsResolver\OptionsResolver;

class UserType extends AbstractType
{
    public function buildForm(FormBuilderInterface $builder, array $options): void
    {
        $builder
            ->add('name', TextType::class, [
                'label' => 'Full Name',
                'attr' => ['placeholder' => 'John Doe'],
            ])
            ->add('email', EmailType::class, [
                'label' => 'Email Address',
            ])
            ->add('password', RepeatedType::class, [
                'type' => PasswordType::class,
                'first_options' => ['label' => 'Password'],
                'second_options' => ['label' => 'Confirm Password'],
                'invalid_message' => 'The passwords do not match.',
            ])
        ;
    }

    public function configureOptions(OptionsResolver $resolver): void
    {
        $resolver->setDefaults([
            'data_class' => User::class,
        ]);
    }
}
```

## Validation Constraints

### On Entity

```php
<?php
// src/Entity/User.php

namespace App\Entity;

use Symfony\Component\Validator\Constraints as Assert;
use Symfony\Bridge\Doctrine\Validator\Constraints\UniqueEntity;

#[ORM\Entity]
#[UniqueEntity(fields: ['email'], message: 'This email is already registered.')]
class User
{
    #[ORM\Column(length: 255)]
    #[Assert\NotBlank(message: 'Please enter your name.')]
    #[Assert\Length(
        min: 2,
        max: 100,
        minMessage: 'Name must be at least {{ limit }} characters.',
        maxMessage: 'Name cannot exceed {{ limit }} characters.',
    )]
    private string $name;

    #[ORM\Column(length: 255, unique: true)]
    #[Assert\NotBlank]
    #[Assert\Email(message: 'Please enter a valid email address.')]
    private string $email;

    #[ORM\Column]
    #[Assert\NotBlank]
    #[Assert\Length(min: 8, minMessage: 'Password must be at least {{ limit }} characters.')]
    #[Assert\Regex(
        pattern: '/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/',
        message: 'Password must contain uppercase, lowercase, and numbers.',
    )]
    private string $password;

    #[ORM\Column(type: 'date')]
    #[Assert\NotNull]
    #[Assert\LessThan('-18 years', message: 'You must be at least 18 years old.')]
    private \DateTimeInterface $birthDate;
}
```

### On Form Type

```php
public function buildForm(FormBuilderInterface $builder, array $options): void
{
    $builder
        ->add('website', UrlType::class, [
            'constraints' => [
                new Assert\Url(),
                new Assert\Length(['max' => 255]),
            ],
        ])
        ->add('age', IntegerType::class, [
            'constraints' => [
                new Assert\Range(['min' => 18, 'max' => 120]),
            ],
        ])
    ;
}
```

## Validation Groups

```php
<?php
// src/Entity/User.php

class User
{
    #[Assert\NotBlank(groups: ['registration', 'profile'])]
    private string $name;

    #[Assert\NotBlank(groups: ['registration'])]
    #[Assert\Email(groups: ['registration', 'profile'])]
    private string $email;

    #[Assert\NotBlank(groups: ['registration'])]
    private string $password;
}

// src/Form/RegistrationType.php

public function configureOptions(OptionsResolver $resolver): void
{
    $resolver->setDefaults([
        'data_class' => User::class,
        'validation_groups' => ['registration'],
    ]);
}

// src/Form/ProfileType.php

public function configureOptions(OptionsResolver $resolver): void
{
    $resolver->setDefaults([
        'data_class' => User::class,
        'validation_groups' => ['profile'],
    ]);
}
```

## Custom Constraint

```php
<?php
// src/Validator/Constraints/ValidPhoneNumber.php

namespace App\Validator\Constraints;

use Symfony\Component\Validator\Constraint;

#[\Attribute]
class ValidPhoneNumber extends Constraint
{
    public string $message = 'The phone number "{{ value }}" is not valid.';
    public string $region = 'FR';
}

// src/Validator/Constraints/ValidPhoneNumberValidator.php

namespace App\Validator\Constraints;

use Symfony\Component\Validator\Constraint;
use Symfony\Component\Validator\ConstraintValidator;
use Symfony\Component\Validator\Exception\UnexpectedTypeException;

class ValidPhoneNumberValidator extends ConstraintValidator
{
    public function validate(mixed $value, Constraint $constraint): void
    {
        if (!$constraint instanceof ValidPhoneNumber) {
            throw new UnexpectedTypeException($constraint, ValidPhoneNumber::class);
        }

        if (null === $value || '' === $value) {
            return; // Let NotBlank handle empty values
        }

        // Custom validation logic
        $phoneUtil = \libphonenumber\PhoneNumberUtil::getInstance();
        try {
            $number = $phoneUtil->parse($value, $constraint->region);
            if (!$phoneUtil->isValidNumber($number)) {
                $this->context->buildViolation($constraint->message)
                    ->setParameter('{{ value }}', $value)
                    ->addViolation();
            }
        } catch (\Exception $e) {
            $this->context->buildViolation($constraint->message)
                ->setParameter('{{ value }}', $value)
                ->addViolation();
        }
    }
}
```

Usage:

```php
#[ValidPhoneNumber(region: 'US')]
private string $phone;
```

## Data Transformers

```php
<?php
// src/Form/DataTransformer/TagsTransformer.php

namespace App\Form\DataTransformer;

use App\Entity\Tag;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Form\DataTransformerInterface;

class TagsTransformer implements DataTransformerInterface
{
    public function __construct(
        private EntityManagerInterface $em,
    ) {}

    // Entity Collection -> String (for display)
    public function transform(mixed $value): string
    {
        if ($value->isEmpty()) {
            return '';
        }

        return implode(', ', $value->map(fn(Tag $tag) => $tag->getName())->toArray());
    }

    // String -> Entity Collection (from input)
    public function reverseTransform(mixed $value): ArrayCollection
    {
        if (!$value) {
            return new ArrayCollection();
        }

        $names = array_map('trim', explode(',', $value));
        $tags = new ArrayCollection();

        foreach ($names as $name) {
            if (empty($name)) {
                continue;
            }

            $tag = $this->em->getRepository(Tag::class)->findOneBy(['name' => $name]);

            if (!$tag) {
                $tag = new Tag();
                $tag->setName($name);
                $this->em->persist($tag);
            }

            $tags->add($tag);
        }

        return $tags;
    }
}
```

Usage in form:

```php
public function buildForm(FormBuilderInterface $builder, array $options): void
{
    $builder
        ->add('tags', TextType::class, [
            'label' => 'Tags (comma-separated)',
        ])
    ;

    $builder->get('tags')->addModelTransformer($this->tagsTransformer);
}
```

## Form Events

```php
public function buildForm(FormBuilderInterface $builder, array $options): void
{
    $builder
        ->add('country', CountryType::class)
    ;

    // Add state field dynamically based on country
    $builder->addEventListener(FormEvents::PRE_SET_DATA, function (FormEvent $event) {
        $form = $event->getForm();
        $data = $event->getData();

        $country = $data?->getCountry();
        $this->addStateField($form, $country);
    });

    $builder->addEventListener(FormEvents::PRE_SUBMIT, function (FormEvent $event) {
        $form = $event->getForm();
        $data = $event->getData();

        $country = $data['country'] ?? null;
        $this->addStateField($form, $country);
    });
}

private function addStateField(FormInterface $form, ?string $country): void
{
    if ($country === 'US') {
        $form->add('state', ChoiceType::class, [
            'choices' => $this->usStates,
        ]);
    } else {
        $form->add('state', TextType::class, [
            'required' => false,
        ]);
    }
}
```

## Controller Usage

```php
#[Route('/register', name: 'register')]
public function register(Request $request): Response
{
    $user = new User();
    $form = $this->createForm(UserType::class, $user);

    $form->handleRequest($request);

    if ($form->isSubmitted() && $form->isValid()) {
        $this->em->persist($user);
        $this->em->flush();

        $this->addFlash('success', 'Registration successful!');
        return $this->redirectToRoute('home');
    }

    return $this->render('security/register.html.twig', [
        'form' => $form,
    ]);
}
```

> **HTTP 422 on invalid submit (Symfony 8.0+):** pass the *form* (not
> `$form->createView()`) to `render()`. When the form was submitted and is
> invalid, Symfony automatically sets the response status to
> **422 Unprocessable Content** (Turbo-compatible) instead of 200. The snippet
> above already passes `'form' => $form`, so it benefits from this.

## Recent Constraints

```php
use Symfony\Component\Validator\Constraints as Assert;

class ChangePassword
{
    // Strong password without a regex (weak | medium | strong | very_strong)
    #[Assert\PasswordStrength(minScore: Assert\PasswordStrength::STRENGTH_STRONG)]
    #[Assert\NotCompromisedPassword]
    public string $newPassword;

    // Run constraints in order, stopping at the first violation
    #[Assert\Sequentially([
        new Assert\NotBlank(),
        new Assert\Length(min: 3),
        new Assert\Regex('/^[a-z0-9_]+$/'),
    ])]
    public string $username;

    // Conditional validation
    #[Assert\When(
        expression: 'this.type === "company"',
        constraints: [new Assert\NotBlank(), new Assert\Length(max: 14)],
    )]
    public ?string $vatNumber = null;

    public string $type = 'individual';
}
```

## Multi-Step Forms (Symfony 8.1+ — verify)

```php
// Build a form spread across several steps from a single object.
$form = $this->createFormFlowBuilder($task)->getForm();
```

## Custom Violation Mapper (Symfony 8.1+ — verify)

Override how constraint violations are mapped onto form fields by implementing
`ViolationMapperInterface`; it is auto-registered as the `form.violation_mapper`
service.

```php
use Symfony\Component\Form\Util\ViolationMapperInterface;

class CustomViolationMapper implements ViolationMapperInterface
{
    public function mapViolation(
        ConstraintViolation $violation,
        FormInterface $form,
        bool $allowNonSynchronized = false,
    ): void {
        // custom mapping
    }
}
```

## Best Practices

1. **Constraints on entities**: Primary validation source
2. **Form constraints for UI-specific validation**: File uploads, etc.
3. **Validation groups**: Different rules for different contexts
4. **Data transformers**: Convert between formats
5. **Custom constraints**: Reusable business logic
6. **Test validation**: Unit test constraints


## Skill Operating Checklist

### Design checklist
- Confirm operation boundaries and invariants first.
- Minimize scope while preserving contract correctness.
- Test both happy path and negative path behavior.

### Validation commands
- ./vendor/bin/phpunit --filter=Voter
- php bin/console debug:container security
- ./vendor/bin/phpstan analyse

### Failure modes to test
- Invalid payload or forbidden actor.
- Boundary values / not-found cases.
- Retry or partial-failure behavior for async flows.

