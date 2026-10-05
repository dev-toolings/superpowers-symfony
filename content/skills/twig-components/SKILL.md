---
name: twig-components
description: Build reusable UI components with Symfony UX Twig Components (props, slots, anonymous components, CVA) for clean templates
capabilities: [read, search]
tags: [architecture, ui]
# projected by `bun run build` — do not edit by hand
allowed-tools:
  - Read
  - Glob
  - Grep
---

# Twig Components (Symfony)

## Use when
- Extracting a repeated piece of Twig into a reusable component.
- Building a component with props, slots, computed logic, or CVA variants.
- Making a component reactive with Live Components (search, counters, forms).

## Default workflow
1. Choose the kind: anonymous (template only), class-based `#[AsTwigComponent]`, or `#[AsLiveComponent]`.
2. Declare props as public mutable properties; use `mount()` for derived values.
3. Expose content injection through blocks (slots) rather than more props.
4. For Live Components, mark writable state with `#[LiveProp(writable: true)]` and debounce user input.
5. Test the PHP class with `InteractsWithTwigComponents`.

## Guardrails
- Never make public props `readonly`: they are assigned after instantiation.
- Inject services as `private readonly`, never as public props.
- Only mark a `LiveProp` writable when the browser must change it.
- Keep one responsibility per component.

## Progressive disclosure
- Use this file for execution posture and risk controls.
- Open references when deep implementation details are needed.

## Output contract
- Component classes and templates, with their props and slots.
- Live state and actions, when the component is reactive.
- A component test for mount and render.

## References
- `reference.md`
