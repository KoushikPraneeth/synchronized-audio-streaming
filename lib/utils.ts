import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRoomCode(code: string): string {
  return code.toUpperCase().match(/.{1,3}/g)?.join('-') || code;
}

export function generateRandomCode(length: number = 6): string {
  const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

export function calculateBufferTime(networkLatency: number): number {
  // Base buffer time plus additional buffer based on network latency
  return Math.max(100, networkLatency * 1.5);
}