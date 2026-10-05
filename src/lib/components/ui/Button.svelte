<script lang="ts">
  // Shared button. Use this for new UI instead of repeating long class strings.
  import type { Snippet } from 'svelte';
  import Icon from './Icon.svelte';
  let {
    variant = 'primary',
    size = 'md',
    type = 'button',
    icon = '',
    href = '',
    target = '',
    disabled = false,
    loading = false,
    full = false,
    label = '',
    onclick,
    children
  }: {
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
    size?: 'sm' | 'md';
    type?: 'button' | 'submit';
    icon?: string;
    href?: string;
    /** Use '_blank' for links that leave the app. */
    target?: string;
    disabled?: boolean;
    loading?: boolean;
    full?: boolean;
    /** Accessible name for icon only buttons. */
    label?: string;
    onclick?: (event: MouseEvent) => void;
    children?: Snippet;
  } = $props();

  const base =
    'inline-flex items-center justify-center gap-2 rounded-lg border font-semibold whitespace-nowrap transition active:scale-[0.98] focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#55a9f2] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100 [-webkit-tap-highlight-color:transparent] no-underline cursor-pointer';
  const variants = {
    primary:
      'border-[#086bc9] bg-[linear-gradient(135deg,#0877d8,#1559d6)] text-white shadow-[0_8px_18px_#075fc71a] hover:bg-[linear-gradient(135deg,#0568c4,#124bc5)]',
    secondary: 'border-[#cfe0f5] bg-white text-[#17365f] hover:border-[#9cc3ef] hover:bg-[#f5f9ff]',
    ghost: 'border-transparent bg-transparent text-[#075fc7] hover:bg-[#e9f3ff]',
    danger: 'border-[#f3c6c0] bg-white text-[#b3402e] hover:bg-[#fff4f1]'
  };
  const sizes = { sm: 'min-h-9 px-3 text-[13px]', md: 'min-h-[42px] px-4 text-sm' };
  const iconOnly = $derived(!children);
  const classes = $derived(
    [base, variants[variant], sizes[size], full ? 'w-full' : '', iconOnly ? (size === 'sm' ? '!px-0 w-9' : '!px-0 w-[42px]') : '']
      .filter(Boolean)
      .join(' ')
  );
</script>

{#if href && !disabled}
  <a
    {href}
    class={classes}
    aria-label={label || undefined}
    target={target || undefined}
    rel={target === '_blank' ? 'noopener noreferrer' : undefined}
    {onclick}
  >
    {#if icon}<Icon name={icon} size={size === 'sm' ? 15 : 17} />{/if}
    {#if children}{@render children()}{/if}
  </a>
{:else}
  <button {type} class={classes} disabled={disabled || loading} aria-label={label || undefined} {onclick}>
    {#if loading}
      <span
        class="size-4 rounded-full border-2 border-current border-t-transparent [animation:spin_0.8s_linear_infinite]"
        aria-hidden="true"
      ></span>
    {:else if icon}<Icon name={icon} size={size === 'sm' ? 15 : 17} />{/if}
    {#if children}{@render children()}{/if}
  </button>
{/if}
