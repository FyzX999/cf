import type { OrderStatus, PublicOrder } from "./types";

export const demoStats = {
  spent: 1482.9,
  orders: 237,
  completed: 219,
  processing: 8,
  balance: 74.2,
};

export const demoOrders: PublicOrder[] = [
  {
    publicId: "CF482917",
    serviceName: "Instagram Followers",
    platform: "instagram",
    quantity: 10000,
    delivered: 2450,
    status: "delivering",
    link: "https://instagram.com/example",
    total: 8.5,
    startedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 60 * 1000).toISOString(),
    estimatedCompletion: "Updating...",
    delivery: "standard",
    paid: true,
  },
  {
    publicId: "CF482841",
    serviceName: "TikTok Video Views",
    platform: "tiktok",
    quantity: 50000,
    delivered: 50000,
    status: "completed",
    link: "https://tiktok.com/@example/video/1",
    total: 2.5,
    startedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    estimatedCompletion: "Completed",
    delivery: "fast",
    paid: true,
  },
  {
    publicId: "CF482612",
    serviceName: "YouTube Likes",
    platform: "youtube",
    quantity: 2000,
    delivered: 2000,
    status: "completed",
    link: "https://youtube.com/watch?v=example",
    total: 1.9,
    startedAt: new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 28 * 60 * 60 * 1000).toISOString(),
    estimatedCompletion: "Completed",
    delivery: "standard",
    paid: true,
  },
];

export const demoTransactions = [
  { id: "TXN-82917291", type: "Deposit", method: "Card", amount: 100, date: "Today 11:04 AM" },
  { id: "TXN-82917202", type: "Order", method: "Wallet", amount: -8.5, date: "Today 12:41 PM" },
  { id: "TXN-82916011", type: "Order", method: "Wallet", amount: -2.5, date: "Today 9:18 AM" },
  { id: "TXN-82899120", type: "Deposit", method: "Crypto", amount: 50, date: "Yesterday" },
];

export const demoRefills = [
  {
    id: "19271",
    orderId: "CF482917",
    original: 10000,
    current: 9640,
    protectedQty: 10000,
    status: "processing" as OrderStatus,
  },
];

export const demoTickets = [
  { id: "72914", category: "Order Issue", subject: "Delivery slower than usual", status: "Open", updated: "12m ago" },
  { id: "72819", category: "Payment Issue", subject: "Deposit pending", status: "Waiting", updated: "1d ago" },
];

export const demoActivity = [
  { text: "Order #82917 created", time: "12s" },
  { text: "Order #82916 completed", time: "48s" },
  { text: "User FyzX deposited $100", time: "2m" },
  { text: "Service #192 provider response received", time: "3m" },
  { text: "Ticket #72819 opened", time: "11m" },
];

export const demoAdminStats = {
  revenueToday: 1284.4,
  ordersToday: 186,
  active: 41,
  customers: 4821,
  profit: 412.18,
  failed: 3,
  refunds: 2,
  tickets: 7,
};

export const demoApiUsage = {
  keyMasked: "••••••••••••••••CF91",
  url: "https://cheapfollower.shop/api/v2",
  today: 1284,
  success: 1261,
  failed: 23,
  avgMs: 118,
};
