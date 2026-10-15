export const campusPageAllowed = (path:string) => /^\/campus\/(dashboard|profile|pencairan|pelaporan|lpj|guide|notifications)\/?$/.test(path);
export const campusApiAllowed = (path:string) =>
 /^\/api\/(?:monitoring\/[a-z0-9]{15}(?:\/files(?:\/[a-z0-9]{15})?)?|pencairan(?:\/.*)?|campuses\/[a-z0-9]{15}\/program|session(?:\/realtime)?|navigation|health|audit|notifications\/read|views\/notifications|auth\/(?:me|logout|change-password))$/.test(path);
