export const campusPageAllowed = (path:string) => /^\/campus\/(dashboard|profile|pencairan|guide|notifications)\/?$/.test(path);
export const campusApiAllowed = (path:string) =>
 /^\/api\/(?:pencairan(?:\/.*)?|campuses\/[a-z0-9]{15}\/program|session(?:\/realtime)?|navigation|health|audit|notifications\/read|views\/notifications|auth\/(?:me|logout|change-password))$/.test(path);
