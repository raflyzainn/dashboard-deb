export const campusPageAllowed = (path:string) => /^\/campus\/(dashboard|pencairan|guide|notifications)\/?$/.test(path);
export const campusApiAllowed = (path:string) =>
 /^\/api\/(?:pencairan(?:\/.*)?|session(?:\/realtime)?|navigation|health|audit|notifications\/read|views\/notifications|auth\/(?:me|logout|change-password))$/.test(path);
