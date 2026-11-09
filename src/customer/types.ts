export type Merchant = { id: number; shop_name: string; image?: string | null; cover_image?: string | null; description?: string; category?: string; address?: string; is_open: boolean; rating?: string | number; };
export type Product = { id: number; merchant: number; merchant_name?: string; name: string; category?: string; description?: string; image?: string | null; price: string | number; available: boolean; };
export type CartLine = { product: Product; quantity: number };
export type Order = { id: number; status: string; merchant_name?: string; total: string | number; dropoff_address?: string; created_at?: string; };
