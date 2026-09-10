import type PocketBase from 'pocketbase';
declare global { namespace App { interface Locals { pb: PocketBase | null } } }
export {};
