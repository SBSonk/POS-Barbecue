import os from 'os';

export function getLocalIpAddresses(): string[] {
  const interfaces = os.networkInterfaces();
  const addresses: string[] = [];

  for (const name of Object.keys(interfaces)) {
    const netInterfaces = interfaces[name];
    if (!netInterfaces) continue;

    for (const net of netInterfaces) {
      // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
      // Node 18+ uses family: 'IPv4' or 4
      const isIPv4 = net.family === 'IPv4' || (net.family as unknown as number) === 4;
      if (isIPv4 && !net.internal) {
        addresses.push(net.address);
      }
    }
  }

  return addresses;
}
