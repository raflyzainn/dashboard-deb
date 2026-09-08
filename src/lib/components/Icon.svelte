<script lang="ts">
  let { name = 'leaf', size = 20 }: { name?: string; size?: number } = $props();
  const paths: Record<string, string> = {
    verifikasi: 'M9 12l2 2 4-4M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
    leaf: 'M5 18C2 6 12 3 21 3c0 10-4 18-14 16M6 18 16 8',
    dashboard: 'M3 3h7v7H3zM14 3h7v4h-7zM14 11h7v10h-7zM3 14h7v7H3z',
    campus: 'm3 9 9-6 9 6M4 21h16M6 10v7m6-7v7m6-7v7M3 9h18',
    campuses: 'm3 9 9-6 9 6M4 21h16M6 10v7m6-7v7m6-7v7M3 9h18',
    indicators: 'M4 5h2m4 0h10M4 12h2m4 0h10M4 19h2m4 0h10',
    proposal: 'M14 2H5v20h14V7l-5-5v5h5M8 12h8M8 16h6',
    questions: 'M21 11a8 8 0 0 1-8 8H8l-5 3V5a2 2 0 0 1 2-2h8a8 8 0 0 1 8 8ZM7 8h8M7 12h5',
    faq: 'M9 8a3 3 0 1 1 5 2c-2 1-2 2-2 3m0 3h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
    notifications: 'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4',
    arrow: 'M4 12h16m-6-6 6 6-6 6',
    chevron: 'm9 5 7 7-7 7',
    down: 'm6 9 6 6 6-6',
    up: 'm6 15 6-6 6 6',
    check: 'm5 12 4 4L19 6',
    plus: 'M12 5v14M5 12h14',
    search: 'M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
    edit: 'm14 4 6 6M3 21l5-1L21 7l-5-5L3 15v6Z',
    clock: 'M12 6v6l4 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
    upload: 'M12 16V3m-5 5 5-5 5 5M4 15v6h16v-6',
    download: 'M12 3v13m-5-5 5 5 5-5M4 17v4h16v-4',
    like: 'M7 10v11H3V10h4Zm0 0 5-8c3 0 2 5 2 7h6c2 0 1 4 1 5l-2 7H7',
    logout: 'M9 4H3v16h6m5-13 5 5-5 5m-7-5h14',
    reset: 'M3 10a9 9 0 1 1 1 8M3 3v7h7',
    close: 'm6 6 12 12M6 18 18 6',
    menu: 'M4 6h16M4 12h16M4 18h16',
    alert: 'm12 3 10 18H2L12 3Zm0 6v5m0 3h.01',
    globe: 'M2 12h20M12 2c6 6 6 14 0 20-6-6-6-14 0-20Zm10 10a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
    target: 'm16 8 6-6m-1 6h-5V3M18 12a6 6 0 1 1-6-6M22 12a10 10 0 1 1-10-10',
    trash: 'M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7',
    eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Zm13 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0'
  };
</script>
<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d={paths[name] || paths.leaf}/></svg>
