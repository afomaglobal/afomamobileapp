declare module 'socket.io-client/dist/socket.io.js' {
  import type { Socket } from 'socket.io-client';

  export type { Socket };
  export default function io(uri: string, opts?: Record<string, unknown>): Socket;
}
