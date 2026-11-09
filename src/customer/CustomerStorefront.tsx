
import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { api, mediaUrl } from '../api';
import type { CartLine, Merchant, Order, Product } from './types';

type Props = { lang: 'ar' | 'en' | 'he' };

type Copy = {
  greeting: string;
  subtitle: string;
  search: string;
  stores: string;
  all: string;
  products: string;
  add: string;
  added: string;
  cart: string;
  empty: string;
  checkout: string;
  address: string;
  notes: string;
  placeOrder: string;
  cash: string;
  subtotal: string;
  total: string;
  orders: string;
  loading: string;
  retry: string;
  noStores: string;
  noProducts: string;
  searchEmpty: string;
  success: string;
  quantity: string;
  remove: string;
  open: string;
  closed: string;
  category: string;
  storeHint: string;
  cartHint: string;
  orderError: string;
  chooseStore: string;
  clearCart: string;
  deliveryFeeNote: string;
};

const copy: Record<Props['lang'], Copy> = {
  ar: {
    greeting: 'كل احتياجاتك، توصلك',
    subtitle: 'تسوّق من متاجرك المفضلة في فلسطين بكل سهولة.',
    search: 'ابحث عن متجر أو منتج...',
    stores: 'المتاجر القريبة',
    all: 'الكل',
    products: 'المنتجات',
    add: 'أضف للسلة',
    added: 'أضيفت للسلة',
    cart: 'سلة المشتريات',
    empty: 'سلتك فارغة حالياً',
    checkout: 'إتمام الطلب',
    address: 'عنوان التوصيل',
    notes: 'ملاحظات للمندوب (اختياري)',
    placeOrder: 'تأكيد الطلب',
    cash: 'الدفع نقداً عند الاستلام',
    subtotal: 'المجموع الفرعي',
    total: 'الإجمالي',
    orders: 'طلباتي الأخيرة',
    loading: 'جارٍ التحميل...',
    retry: 'إعادة المحاولة',
    noStores: 'لا توجد متاجر متاحة حالياً.',
    noProducts: 'لا توجد منتجات متاحة في هذا المتجر.',
    searchEmpty: 'لا توجد نتائج مطابقة.',
    success: 'تم إرسال طلبك إلى المتجر بنجاح.',
    quantity: 'الكمية',
    remove: 'حذف',
    open: 'مفتوح',
    closed: 'مغلق',
    category: 'التصنيف',
    storeHint: 'اختر متجراً لعرض منتجاته',
    cartHint: 'يمكنك الطلب من متجر واحد في كل طلب.',
    orderError: 'تعذر إنشاء الطلب. حاول مرة أخرى.',
    chooseStore: 'اختر متجراً أولاً.',
    clearCart: 'إفراغ السلة',
    deliveryFeeNote: 'رسوم التوصيل لم تُحدد بعد؛ المبلغ المعروض هو قيمة المنتجات فقط.'
  },

  en: {
    greeting: 'Everything you need, delivered',
    subtitle: 'Shop your favourite local stores across Palestine.',
    search: 'Search stores or products...',
    stores: 'Available stores',
    all: 'All',
    products: 'Products',
    add: 'Add to cart',
    added: 'Added to cart',
    cart: 'Your cart',
    empty: 'Your cart is empty',
    checkout: 'Checkout',
    address: 'Delivery address',
    notes: 'Delivery notes (optional)',
    placeOrder: 'Place order',
    cash: 'Cash on delivery',
    subtotal: 'Subtotal',
    total: 'Total',
    orders: 'Recent orders',
    loading: 'Loading...',
    retry: 'Retry',
    noStores: 'No stores are available right now.',
    noProducts: 'No products available in this store.',
    searchEmpty: 'No matching results.',
    success: 'Your order was sent to the store.',
    quantity: 'Quantity',
    remove: 'Remove',
    open: 'Open',
    closed: 'Closed',
    category: 'Category',
    storeHint: 'Choose a store to explore its products',
    cartHint: 'Orders can contain products from one store only.',
    orderError: 'Failed to place the order. Please try again.',
    chooseStore: 'Choose a store first.',
    clearCart: 'Clear cart',
    deliveryFeeNote: 'Delivery fees are not configured yet; the amount shown covers products only.'
  },

  he: {
    greeting: 'כל מה שצריך, עד אליך',
    subtitle: 'קונים בקלות מהחנויות המקומיות האהובות עליכם.',
    search: 'חיפוש חנות או מוצר...',
    stores: 'חנויות זמינות',
    all: 'הכל',
    products: 'מוצרים',
    add: 'הוספה לסל',
    added: 'נוסף לסל',
    cart: 'סל הקניות',
    empty: 'סל הקניות ריק',
    checkout: 'לתשלום',
    address: 'כתובת למשלוח',
    notes: 'הערות לשליח (לא חובה)',
    placeOrder: 'שליחת הזמנה',
    cash: 'תשלום במזומן בעת המסירה',
    subtotal: 'סכום ביניים',
    total: 'סה״כ',
    orders: 'הזמנות אחרונות',
    loading: 'טוען...',
    retry: 'נסה שוב',
    noStores: 'אין חנויות זמינות כרגע.',
    noProducts: 'אין מוצרים זמינים בחנות זו.',
    searchEmpty: 'לא נמצאו תוצאות.',
    success: 'ההזמנה נשלחה לחנות.',
    quantity: 'כמות',
    remove: 'הסרה',
    open: 'פתוח',
    closed: 'סגור',
    category: 'קטגוריה',
    storeHint: 'בחרו חנות כדי לצפות במוצרים',
    cartHint: 'ניתן להזמין ממקום אחד בכל הזמנה.',
    orderError: 'לא ניתן ליצור את ההזמנה. נסו שוב.',
    chooseStore: 'יש לבחור חנות תחילה.',
    clearCart: 'ריקון הסל',
    deliveryFeeNote: 'דמי המשלוח עדיין לא הוגדרו; הסכום המוצג כולל מוצרים בלבד.'
  }
};

const money = (value: string | number) =>
  `${Number(value || 0).toFixed(2)} ₪`;

const readCart = (): CartLine[] => {
  try {
    return JSON.parse(
      localStorage.getItem('waselni_customer_cart') || '[]'
    ) as CartLine[];
  } catch {
    return [];
  }
};

const rows = <T,>(value: unknown): T[] =>
  Array.isArray(value)
    ? value as T[]
    : ((value as { results?: T[] })?.results || []);

export default function CustomerStorefront({ lang }: Props) {
  const t = copy[lang];
  const rtl = lang !== 'en';

  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedMerchant, setSelectedMerchant] = useState<number | null>(null);
  const [cart, setCart] = useState<CartLine[]>(readCart);
  const [search, setSearch] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [loadingStores, setLoadingStores] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let alive = true;

    api('/merchants/')
      .then(data => {
        if (alive) setMerchants(rows<Merchant>(data));
      })
      .catch(e => {
        if (alive) setError(e.message || t.orderError);
      })
      .finally(() => {
        if (alive) setLoadingStores(false);
      });

    api('/orders/')
      .then(data => {
        if (alive) setOrders(rows<Order>(data).slice(0, 3));
      })
      .catch(() => undefined);

    return () => {
      alive = false;
    };
  }, [t.orderError]);

  useEffect(() => {
    localStorage.setItem('waselni_customer_cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    let alive = true;

    if (!selectedMerchant) {
      setProducts([]);
      return () => {
        alive = false;
      };
    }

    setLoadingProducts(true);

    api(`/products/?merchant=${selectedMerchant}`)
      .then(data => {
        if (alive) {
          setProducts(
            rows<Product>(data).filter(p => p.available !== false)
          );
        }
      })
      .catch(e => {
        if (alive) setError(e.message || t.orderError);
      })
      .finally(() => {
        if (alive) setLoadingProducts(false);
      });

    return () => {
      alive = false;
    };
  }, [selectedMerchant, t.orderError]);

  const activeMerchant =
    merchants.find(m => m.id === selectedMerchant) || null;

  const filteredMerchants = useMemo(
    () =>
      merchants.filter(m =>
        `${m.shop_name} ${m.category || ''}`
          .toLowerCase()
          .includes(search.toLowerCase())
      ),
    [merchants, search]
  );

  const filteredProducts = useMemo(
    () =>
      products.filter(p =>
        `${p.name} ${p.category || ''}`
          .toLowerCase()
          .includes(search.toLowerCase())
      ),
    [products, search]
  );

  const subtotal = cart.reduce(
    (sum, line) =>
      sum + Number(line.product.price) * line.quantity,
    0
  );

  const cartCount = cart.reduce(
    (sum, line) => sum + line.quantity,
    0
  );

  function addProduct(product: Product) {
    if (
      cart.length &&
      cart[0].product.merchant !== product.merchant
    ) {
      setError(t.chooseStore);
      return;
    }

    setError('');
    setNotice(t.added);

    setCart(current => {
      const found = current.find(
        line => line.product.id === product.id
      );

      if (found) {
        return current.map(line =>
          line.product.id === product.id
            ? {
                ...line,
                quantity: Math.min(50, line.quantity + 1)
              }
            : line
        );
      }

      return [...current, { product, quantity: 1 }];
    });
  }

  function changeQuantity(id: number, delta: number) {
    setCart(current =>
      current
        .map(line =>
          line.product.id === id
            ? { ...line, quantity: line.quantity + delta }
            : line
        )
        .filter(
          line => line.quantity > 0 && line.quantity <= 50
        )
    );
  }

  async function checkout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!cart.length || !address.trim() || submitting) return;

    setSubmitting(true);
    setError('');
    setNotice('');

    const key =
      globalThis.crypto?.randomUUID?.() ||
      `waselni-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    try {
      const result = await api('/orders/', {
        method: 'POST',
        headers: { 'Idempotency-Key': key },
        body: JSON.stringify({
          merchant: cart[0].product.merchant,
          items: cart.map(line => ({
            product_id: line.product.id,
            quantity: line.quantity
          })),
          dropoff_address: address.trim(),
          dropoff_notes: notes.trim(),
          payment_method: 'cash',
          order_type: 'store'
        })
      });

      setCart([]);
      setAddress('');
      setNotes('');
      setNotice(`${t.success} #${result.id}`);

      const latest = await api('/orders/');
      setOrders(rows<Order>(latest).slice(0, 3));
    } catch (e) {
      setError(
        e instanceof Error ? e.message : t.orderError
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="customer-v2" dir={rtl ? 'rtl' : 'ltr'}>
      <section className="customer-v2-hero">
        <div className="customer-v2-hero-copy">
          <span className="customer-v2-kicker">
            WASELNI · PALESTINE
          </span>
          <h1>{t.greeting}</h1>
          <p>{t.subtitle}</p>

          <div className="customer-v2-search">
            <span aria-hidden="true">⌕</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t.search}
              aria-label={t.search}
            />
          </div>
        </div>

        <div className="customer-v2-hero-art" aria-hidden="true">
          <span className="hero-orbit orbit-one" />
          <span className="hero-orbit orbit-two" />
          <span className="hero-bag">و</span>
          <span className="hero-spark">✦</span>
        </div>
      </section>

      <div className="customer-v2-layout">
        <main className="customer-v2-main">
          <section className="customer-v2-section">
            <div className="customer-v2-heading">
              <div>
                <span className="customer-v2-eyebrow">DISCOVER</span>
                <h2>{t.stores}</h2>
                <p>{t.storeHint}</p>
              </div>
              <span className="customer-v2-count">
                {filteredMerchants.length}
              </span>
            </div>

            {loadingStores ? (
              <div className="customer-v2-loading">{t.loading}</div>
            ) : filteredMerchants.length ? (
              <div className="customer-v2-stores">
                {filteredMerchants.map(merchant => (
                  <button
                    key={merchant.id}
                    className={`customer-v2-store ${
                      selectedMerchant === merchant.id
                        ? 'is-selected'
                        : ''
                    }`}
                    onClick={() => {
                      setSelectedMerchant(merchant.id);
                      setError('');
                    }}
                    aria-pressed={selectedMerchant === merchant.id}
                  >
                    <span className="customer-v2-store-image">
                      {merchant.image ? (
                        <img src={mediaUrl(merchant.image)} alt="" />
                      ) : (
                        <span>◈</span>
                      )}
                    </span>

                    <span className="customer-v2-store-info">
                      <b>{merchant.shop_name}</b>
                      <small>{merchant.category || t.category}</small>
                      <em className={merchant.is_open ? 'is-open' : 'is-closed'}>
                        {merchant.is_open ? t.open : t.closed}
                      </em>
                    </span>

                    <span className="customer-v2-chevron">‹</span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="customer-v2-empty">
                {search ? t.searchEmpty : t.noStores}
              </p>
            )}
          </section>

          <section className="customer-v2-section">
            <div className="customer-v2-heading">
              <div>
                <span className="customer-v2-eyebrow">MENU</span>
                <h2>{activeMerchant?.shop_name || t.products}</h2>
                <p>{t.products}</p>
              </div>
            </div>

            {!selectedMerchant ? (
              <div className="customer-v2-placeholder">
                <span>▦</span>
                <p>{t.storeHint}</p>
              </div>
            ) : loadingProducts ? (
              <div className="customer-v2-loading">{t.loading}</div>
            ) : filteredProducts.length ? (
              <div className="customer-v2-products">
                {filteredProducts.map(product => (
                  <article
                    className="customer-v2-product"
                    key={product.id}
                  >
                    <div className="customer-v2-product-image">
                      {product.image ? (
                        <img
                          src={mediaUrl(product.image)}
                          alt={product.name}
                          loading="lazy"
                        />
                      ) : (
                        <span>◫</span>
                      )}
                    </div>

                    <div className="customer-v2-product-body">
                      <small>
                        {product.category || activeMerchant?.category || ''}
                      </small>
                      <h3>{product.name}</h3>

                      {product.description && (
                        <p>{product.description}</p>
                      )}

                      <div className="customer-v2-product-footer">
                        <b>{money(product.price)}</b>
                        <button onClick={() => addProduct(product)}>
                          {t.add} <span>＋</span>
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="customer-v2-empty">{t.noProducts}</p>
            )}
          </section>

          <section className="customer-v2-section customer-v2-recent">
            <div className="customer-v2-heading">
              <div>
                <span className="customer-v2-eyebrow">ACTIVITY</span>
                <h2>{t.orders}</h2>
              </div>
            </div>

            {orders.length ? (
              <div className="customer-v2-order-list">
                {orders.map(order => (
                  <div className="customer-v2-order" key={order.id}>
                    <span className="customer-v2-order-icon">↗</span>
                    <div>
                      <b>
                        #{order.id} · {order.merchant_name || 'WASELNI'}
                      </b>
                      <small>
                        {order.dropoff_address || order.status}
                      </small>
                    </div>
                    <strong>{money(order.total)}</strong>
                  </div>
                ))}
              </div>
            ) : (
              <p className="customer-v2-empty">—</p>
            )}
          </section>
        </main>

        <aside className="customer-v2-cart-panel">
          <div className="customer-v2-cart-title">
            <div>
              <span className="customer-v2-eyebrow">YOUR ORDER</span>
              <h2>{t.cart}</h2>
            </div>

            <div className="customer-v2-cart-title-actions">
              <span className="customer-v2-cart-badge">{cartCount}</span>

              {cart.length > 0 && (
                <button
                  type="button"
                  className="customer-v2-clear"
                  onClick={() => setCart([])}
                >
                  {t.clearCart}
                </button>
              )}
            </div>
          </div>

          <p className="customer-v2-cart-hint">{t.cartHint}</p>

          {cart.length ? (
            <div className="customer-v2-cart-lines">
              {cart.map(line => (
                <div
                  className="customer-v2-cart-line"
                  key={line.product.id}
                >
                  <div className="customer-v2-cart-line-main">
                    <b>{line.product.name}</b>
                    <small>{money(line.product.price)}</small>
                  </div>

                  <div className="customer-v2-qty">
                    <button
                      onClick={() =>
                        changeQuantity(line.product.id, -1)
                      }
                      aria-label="Decrease"
                    >
                      −
                    </button>

                    <span>{line.quantity}</span>

                    <button
                      onClick={() =>
                        changeQuantity(line.product.id, 1)
                      }
                      aria-label="Increase"
                    >
                      ＋
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="customer-v2-cart-empty">
              <span>🛍</span>
              <p>{t.empty}</p>
            </div>
          )}

          <div className="customer-v2-totals">
            <div>
              <span>{t.subtotal}</span>
              <b>{money(subtotal)}</b>
            </div>

            <div className="customer-v2-grand-total">
              <span>{t.total}</span>
              <strong>{money(subtotal)}</strong>
            </div>

            <small className="customer-v2-fee-note">
              {t.deliveryFeeNote}
            </small>
          </div>

          <form className="customer-v2-checkout" onSubmit={checkout}>
            <label>
              {t.address}
              <input
                required
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder={t.address}
              />
            </label>

            <label>
              {t.notes}
              <textarea
                rows={2}
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </label>

            <div className="customer-v2-payment">
              <span>◉</span>
              <div>
                <b>{t.cash}</b>
                <small>
                  {lang === 'ar'
                    ? 'متاح حالياً'
                    : lang === 'he'
                      ? 'זמין כרגע'
                      : 'Currently available'}
                </small>
              </div>
            </div>

            <button
              className="customer-v2-submit"
              disabled={!cart.length || !address.trim() || submitting}
            >
              {submitting ? t.loading : t.placeOrder}
              <span>←</span>
            </button>
          </form>

          {error && (
            <p className="customer-v2-feedback is-error" role="alert">
              {error}
            </p>
          )}

          {notice && (
            <p className="customer-v2-feedback is-success" role="status">
              {notice}
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}
