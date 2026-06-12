import { useState, useEffect } from "react";
import { db } from './firebase.js';
import { doc, getDoc, addDoc, collection, onSnapshot, query, where } from 'firebase/firestore';

// ── THEME ─────────────────────────────────────────────────────
const GOLD  = '#C9952A';
const CREAM = '#F2EDE4';
const BG    = '#0A0908';
const SURF  = '#141210';
const CARD  = '#1C1916';
const BORD  = '#2A2420';
const GREEN = '#4CB87A';
const RED   = '#D95050';
const MUTED = '#6A6055';
const BLUE  = '#4A9ECC';

const fmt = (n) => new Intl.NumberFormat('ru-RU').format(Math.round(n || 0));
const nowStr = () => new Date().toISOString();

const S = {
  btn:   (c=GOLD) => ({ background:c, border:'none', borderRadius:10, padding:'14px 20px', color:c===GOLD?'#000':'#fff', fontWeight:700, fontSize:15, cursor:'pointer', width:'100%', fontFamily:'inherit' }),
  btnSm: (c=GOLD) => ({ background:c+'22', border:`1px solid ${c}44`, borderRadius:8, padding:'8px 14px', color:c, fontWeight:600, fontSize:13, cursor:'pointer', fontFamily:'inherit' }),
  input: { background:SURF, border:`1px solid ${BORD}`, borderRadius:10, padding:'12px 14px', color:CREAM, fontSize:15, width:'100%', outline:'none', boxSizing:'border-box', fontFamily:'inherit' },
  label: { fontSize:11, color:MUTED, letterSpacing:1.5, marginBottom:6, textTransform:'uppercase' },
};

// ── HEADER ────────────────────────────────────────────────────
function Header({ cartCount, onCart, onOrders }) {
  return (
    <div style={{ background:SURF, borderBottom:`1px solid ${BORD}`, padding:'14px 18px', display:'flex', justifyContent:'space-between', alignItems:'center', position:'sticky', top:0, zIndex:50 }}>
      <div>
        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:20, color:GOLD, letterSpacing:3 }}>QUEEN STAR</div>
        <div style={{ fontSize:9, color:MUTED, letterSpacing:3, marginTop:1 }}>ДУШАНБЕ · ТАДЖИКИСТАН</div>
      </div>
      <div style={{ display:'flex', gap:8 }}>
        <button style={S.btnSm(MUTED)} onClick={onOrders}>📦 Заказы</button>
        <button style={{ ...S.btnSm(GOLD), position:'relative' }} onClick={onCart}>
          🛒 {cartCount > 0 && <span style={{ background:RED, color:'#fff', borderRadius:'50%', fontSize:10, padding:'1px 5px', position:'absolute', top:-6, right:-6 }}>{cartCount}</span>}
        </button>
      </div>
    </div>
  );
}

// ── PRODUCT CARD ──────────────────────────────────────────────
function ProductCard({ product, photo, onOrder }) {
  const [sel, setSel] = useState(false);
  return (
    <div style={{ background:CARD, border:`1px solid ${BORD}`, borderRadius:14, overflow:'hidden', cursor:'pointer' }} onClick={() => setSel(!sel)}>
      {/* Photo */}
      <div style={{ height:200, background:SURF, display:'flex', alignItems:'center', justifyContent:'center', position:'relative' }}>
        {photo
          ? <img src={photo} alt={product.name} style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
          : <div style={{ fontSize:60 }}>👟</div>
        }
        <div style={{ position:'absolute', top:10, right:10, background:GREEN+'CC', borderRadius:6, padding:'3px 8px', fontSize:11, fontWeight:700, color:'#fff' }}>
          В наличии
        </div>
      </div>
      {/* Info */}
      <div style={{ padding:14 }}>
        <div style={{ fontSize:11, color:GOLD, letterSpacing:1, marginBottom:4 }}>{product.id}</div>
        <div style={{ fontSize:15, fontWeight:700, color:CREAM, marginBottom:6 }}>{product.name}</div>
        <div style={{ fontSize:22, fontWeight:700, color:GOLD, marginBottom:12 }}>{fmt(product.price)} сом</div>
        <button style={S.btn(GOLD)} onClick={(e) => { e.stopPropagation(); onOrder(product); }}>
          Заказать
        </button>
      </div>
    </div>
  );
}

// ── ORDER FORM ────────────────────────────────────────────────
function OrderForm({ product, onClose, onSuccess }) {
  const [name, setName]       = useState('');
  const [phone, setPhone]     = useState('+992');
  const [address, setAddress] = useState('');
  const [size, setSize]       = useState('');
  const [qty, setQty]         = useState('1');
  const [payment, setPayment] = useState('cash');
  const [note, setNote]       = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr]         = useState('');

  const SIZES = ['36','37','38','39','40','41','42'];

  const submit = async () => {
    if (!name.trim()) { setErr('Введи имя'); return; }
    if (phone.length < 10) { setErr('Введи номер телефона'); return; }
    if (!size) { setErr('Выбери размер'); return; }
    setLoading(true); setErr('');
    try {
      const order = {
        customerName:  name.trim(),
        customerPhone: phone.trim(),
        productId:     product.id,
        productName:   product.name,
        qty:           Number(qty),
        price:         product.price,
        total:         Number(qty) * product.price,
        size,
        address:       address.trim(),
        payment,
        note:          note.trim(),
        status:        'new',
        source:        'shop', // from customer site
        date:          nowStr(),
      };
      await addDoc(collection(db, 'shop_orders'), order);
      onSuccess(order);
    } catch(e) {
      setErr('Ошибка. Попробуй ещё раз.');
      console.error(e);
    }
    setLoading(false);
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.9)', zIndex:200, overflowY:'auto' }}>
      <div style={{ minHeight:'100vh', display:'flex', alignItems:'flex-start', justifyContent:'center', padding:'20px 16px' }}>
        <div style={{ background:CARD, borderRadius:16, padding:20, width:'100%', maxWidth:420, border:`1px solid ${BORD}` }}>
          {/* Header */}
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:16, color:GOLD }}>Оформить заказ</div>
            <button style={{ background:'none', border:'none', color:MUTED, fontSize:20, cursor:'pointer' }} onClick={onClose}>✕</button>
          </div>

          {/* Product summary */}
          <div style={{ background:SURF, borderRadius:10, padding:12, marginBottom:16, display:'flex', justifyContent:'space-between' }}>
            <div>
              <div style={{ fontSize:13, fontWeight:700, color:CREAM }}>{product.name}</div>
              <div style={{ fontSize:11, color:MUTED, marginTop:2 }}>Кол-во: {qty}</div>
            </div>
            <div style={{ fontSize:18, fontWeight:700, color:GOLD }}>{fmt(Number(qty)*product.price)} сом</div>
          </div>

          {/* Size selector */}
          <div style={{ marginBottom:14 }}>
            <div style={S.label}>Размер *</div>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              {SIZES.map(s => (
                <div key={s} onClick={() => setSize(s)}
                  style={{ padding:'8px 14px', borderRadius:8, cursor:'pointer', fontSize:14, fontWeight:600,
                    background: size===s ? GOLD : SURF,
                    color: size===s ? '#000' : CREAM,
                    border: `1px solid ${size===s ? GOLD : BORD}` }}>
                  {s}
                </div>
              ))}
            </div>
          </div>

          {/* Qty */}
          <div style={{ marginBottom:14 }}>
            <div style={S.label}>Количество</div>
            <div style={{ display:'flex', gap:8, alignItems:'center' }}>
              <button style={{ ...S.btnSm(MUTED), padding:'8px 16px', fontSize:18 }} onClick={() => setQty(q => String(Math.max(1, Number(q)-1)))}>−</button>
              <div style={{ fontSize:20, fontWeight:700, color:CREAM, minWidth:40, textAlign:'center' }}>{qty}</div>
              <button style={{ ...S.btnSm(GOLD), padding:'8px 16px', fontSize:18 }} onClick={() => setQty(q => String(Number(q)+1))}>+</button>
            </div>
          </div>

          {/* Customer info */}
          <div style={{ marginBottom:12 }}>
            <div style={S.label}>Ваше имя *</div>
            <input style={S.input} value={name} onChange={e=>setName(e.target.value)} placeholder="Зарина"/>
          </div>
          <div style={{ marginBottom:12 }}>
            <div style={S.label}>Номер телефона *</div>
            <input style={S.input} value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+992 900 000000" type="tel"/>
          </div>
          <div style={{ marginBottom:12 }}>
            <div style={S.label}>Адрес доставки</div>
            <input style={S.input} value={address} onChange={e=>setAddress(e.target.value)} placeholder="ул. Рудаки 10, кв. 5"/>
          </div>

          {/* Payment */}
          <div style={{ marginBottom:14 }}>
            <div style={S.label}>Оплата</div>
            <div style={{ display:'flex', background:SURF, borderRadius:10, border:`1px solid ${BORD}`, overflow:'hidden' }}>
              {[{v:'cash',l:'💵 Наличные'},{v:'transfer',l:'📲 Перевод'}].map(opt => (
                <div key={opt.v} onClick={() => setPayment(opt.v)}
                  style={{ flex:1, padding:'10px', textAlign:'center', fontSize:13, fontWeight:600, cursor:'pointer',
                    background:payment===opt.v?GOLD+'22':SURF, color:payment===opt.v?GOLD:MUTED,
                    borderRight:opt.v==='cash'?`1px solid ${BORD}`:'none' }}>
                  {opt.l}
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginBottom:16 }}>
            <div style={S.label}>Заметка (необязательно)</div>
            <input style={S.input} value={note} onChange={e=>setNote(e.target.value)} placeholder="Особые пожелания..."/>
          </div>

          {err && <div style={{ fontSize:13, color:RED, marginBottom:10, textAlign:'center' }}>{err}</div>}

          <button style={S.btn(GOLD)} onClick={submit} disabled={loading}>
            {loading ? 'Оформляем...' : `Заказать — ${fmt(Number(qty)*product.price)} сом`}
          </button>

          <div style={{ fontSize:11, color:MUTED, textAlign:'center', marginTop:10 }}>
            Мы свяжемся с вами по телефону для подтверждения
          </div>
        </div>
      </div>
    </div>
  );
}

// ── SUCCESS SCREEN ────────────────────────────────────────────
function OrderSuccess({ order, onClose }) {
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.95)', zIndex:300, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ background:CARD, borderRadius:16, padding:28, maxWidth:360, width:'100%', textAlign:'center', border:`1px solid ${GREEN}44` }}>
        <div style={{ fontSize:56, marginBottom:14 }}>🎉</div>
        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:22, color:GOLD, marginBottom:8 }}>Заказ принят!</div>
        <div style={{ fontSize:14, color:MUTED, marginBottom:20, lineHeight:1.7 }}>
          Ваш заказ отправлен.<br/>
          Мы свяжемся с <span style={{ color:CREAM, fontWeight:600 }}>{order.customerPhone}</span><br/>
          в течение 30 минут.
        </div>
        <div style={{ background:SURF, borderRadius:10, padding:14, marginBottom:20 }}>
          <div style={{ fontSize:13, fontWeight:600, color:CREAM, marginBottom:6 }}>{order.productName}</div>
          <div style={{ fontSize:13, color:MUTED }}>Размер: {order.size} · Кол-во: {order.qty}</div>
          <div style={{ fontSize:20, fontWeight:700, color:GOLD, marginTop:6 }}>{fmt(order.total)} сом</div>
          <div style={{ fontSize:12, color:MUTED, marginTop:4 }}>{order.payment==='cash'?'💵 Наличные':'📲 Перевод'}</div>
        </div>
        <button style={S.btn(GOLD)} onClick={onClose}>← Продолжить покупки</button>
      </div>
    </div>
  );
}

// ── MY ORDERS ─────────────────────────────────────────────────
function MyOrders({ onClose }) {
  const [phone, setPhone] = useState('');
  const [orders, setOrders] = useState([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);

  const STATUS = {
    new:       { l:'Новый — ждём подтверждения', c:GOLD },
    delivery:  { l:'В доставке', c:BLUE },
    done:      { l:'Выдан ✓', c:GREEN },
    cancelled: { l:'Отменён', c:RED },
  };

  const search = async () => {
    if (phone.length < 8) return;
    setLoading(true);
    try {
      const q = query(collection(db, 'shop_orders'), where('customerPhone', '==', phone.trim()));
      const snap = await new Promise((resolve) => {
        const unsub = onSnapshot(q, (s) => { resolve(s); unsub(); });
      });
      setOrders(snap.docs.map(d => ({ id:d.id, ...d.data() })).sort((a,b) => new Date(b.date)-new Date(a.date)));
      setSearched(true);
    } catch(e) { console.error(e); }
    setLoading(false);
  };

  return (
    <div style={{ position:'fixed', inset:0, background:BG, zIndex:200, overflowY:'auto' }}>
      <div style={{ padding:'16px 16px 80px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
          <button style={{ background:'none', border:'none', color:GOLD, fontSize:22, cursor:'pointer' }} onClick={onClose}>←</button>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:18, color:GOLD }}>Мои заказы</div>
        </div>

        <div style={{ marginBottom:20 }}>
          <div style={S.label}>Введи номер телефона</div>
          <div style={{ display:'flex', gap:8 }}>
            <input style={{ ...S.input, flex:1 }} value={phone} onChange={e=>setPhone(e.target.value)}
              placeholder="+992..." type="tel" onKeyDown={e=>e.key==='Enter'&&search()}/>
            <button style={{ ...S.btnSm(GOLD), whiteSpace:'nowrap' }} onClick={search}>{loading?'...':'Найти'}</button>
          </div>
        </div>

        {searched && orders.length === 0 && (
          <div style={{ textAlign:'center', padding:'32px 0', color:MUTED }}>Заказов не найдено</div>
        )}

        {orders.map(order => {
          const st = STATUS[order.status] || STATUS.new;
          return (
            <div key={order.id} style={{ background:CARD, border:`1px solid ${BORD}`, borderRadius:12, padding:16, marginBottom:12 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                <div style={{ fontSize:14, fontWeight:700, color:CREAM }}>{order.productName}</div>
                <div style={{ fontSize:16, fontWeight:700, color:GOLD }}>{fmt(order.total)} сом</div>
              </div>
              <div style={{ fontSize:12, color:MUTED, marginBottom:8 }}>
                Размер: {order.size} · {order.qty} шт · {new Date(order.date).toLocaleDateString('ru-RU')}
              </div>
              <div style={{ background:st.c+'22', border:`1px solid ${st.c}44`, borderRadius:8, padding:'8px 12px', fontSize:13, fontWeight:600, color:st.c }}>
                {st.l}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── CART ──────────────────────────────────────────────────────
function Cart({ cart, onClose, onCheckout, onRemove }) {
  const total = cart.reduce((s, x) => s + x.total, 0);
  return (
    <div style={{ position:'fixed', inset:0, background:BG, zIndex:200, overflowY:'auto' }}>
      <div style={{ padding:'16px 16px 80px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
          <button style={{ background:'none', border:'none', color:GOLD, fontSize:22, cursor:'pointer' }} onClick={onClose}>←</button>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:18, color:GOLD }}>Корзина ({cart.length})</div>
        </div>

        {cart.length === 0 && (
          <div style={{ textAlign:'center', padding:'40px 0', color:MUTED }}>Корзина пуста</div>
        )}

        {cart.map((item, i) => (
          <div key={i} style={{ background:CARD, border:`1px solid ${BORD}`, borderRadius:12, padding:14, marginBottom:10, display:'flex', gap:12 }}>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:14, fontWeight:700, color:CREAM }}>{item.name}</div>
              <div style={{ fontSize:12, color:MUTED, marginTop:3 }}>Размер: {item.size} · {item.qty} шт</div>
            </div>
            <div style={{ textAlign:'right' }}>
              <div style={{ fontSize:16, fontWeight:700, color:GOLD }}>{fmt(item.total)} сом</div>
              <button style={{ background:'none', border:'none', color:RED, fontSize:12, cursor:'pointer', marginTop:4 }} onClick={() => onRemove(i)}>Удалить</button>
            </div>
          </div>
        ))}

        {cart.length > 0 && (
          <div style={{ position:'fixed', bottom:0, left:0, right:0, padding:16, background:SURF, borderTop:`1px solid ${BORD}` }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10 }}>
              <div style={{ fontSize:14, color:MUTED }}>Итого</div>
              <div style={{ fontSize:20, fontWeight:700, color:GOLD }}>{fmt(total)} сом</div>
            </div>
            <button style={S.btn(GOLD)} onClick={onCheckout}>Оформить заказ</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── MAIN APP ─────────────────────────────────────────────────
export default function ShopApp() {
  const [products, setProducts] = useState([]);
  const [photos, setPhotos]     = useState({});
  const [loading, setLoading]   = useState(true);
  const [screen, setScreen]     = useState('catalog'); // catalog | orders
  const [orderProduct, setOrderProduct] = useState(null);
  const [successOrder, setSuccessOrder] = useState(null);
  const [cart, setCart]         = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [search, setSearch]     = useState('');

  // Load products from same Firebase as management app
  useEffect(() => {
    const load = async () => {
      try {
        const [prodSnap, photoSnap] = await Promise.all([
          getDoc(doc(db, 'qs', 'products')),
          getDoc(doc(db, 'qs', 'photos')),
        ]);
        if (prodSnap.exists()) {
          const all = JSON.parse(prodSnap.data().v);
          setProducts(all.filter(p => !p.transit && (p.qty - (p.reserved||0)) > 0));
        }
        if (photoSnap.exists()) setPhotos(JSON.parse(photoSnap.data().v));
      } catch(e) { console.error(e); }
      setLoading(false);
    };
    load();

    // Real-time product updates
    const unsub = onSnapshot(doc(db,'qs','products'), snap => {
      if (snap.exists()) {
        try {
          const all = JSON.parse(snap.data().v);
          setProducts(all.filter(p => !p.transit && (p.qty-(p.reserved||0)) > 0));
        } catch {}
      }
    });
    return () => unsub();
  }, []);

  const addToCart = (product, size, qty) => {
    setCart(prev => [...prev, { ...product, size, qty: Number(qty), total: product.price * Number(qty) }]);
  };

  const filtered = products.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return (
    <div style={{ background:BG, minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:12 }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=DM+Sans:opsz,wght@9..40,400;9..40,600;9..40,700&display=swap');*{box-sizing:border-box;margin:0;padding:0;}`}</style>
      <div style={{ fontFamily:"'Playfair Display',serif", fontSize:24, color:GOLD, letterSpacing:4 }}>QUEEN STAR</div>
      <div style={{ fontSize:12, color:MUTED }}>Загрузка каталога...</div>
    </div>
  );

  return (
    <div style={{ background:BG, minHeight:'100vh', color:CREAM, fontFamily:"'DM Sans',sans-serif", paddingBottom:20 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,600;9..40,700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        input::placeholder{color:#3A3530;}
        input:focus{border-color:${GOLD}!important;}
      `}</style>

      <Header cartCount={cart.length} onCart={() => setShowCart(true)} onOrders={() => setScreen('orders')} />

      {screen === 'orders' && <MyOrders onClose={() => setScreen('catalog')} />}
      {showCart && <Cart cart={cart} onClose={() => setShowCart(false)} onCheckout={() => { setShowCart(false); }} onRemove={i => setCart(prev => prev.filter((_,idx) => idx !== i))} />}
      {orderProduct && !successOrder && <OrderForm product={orderProduct} onClose={() => setOrderProduct(null)} onSuccess={order => { setOrderProduct(null); setSuccessOrder(order); }} />}
      {successOrder && <OrderSuccess order={successOrder} onClose={() => setSuccessOrder(null)} />}

      {/* Catalog */}
      <div style={{ padding:'16px 14px' }}>
        {/* Banner */}
        <div style={{ background:`linear-gradient(135deg, ${CARD}, #1A1510)`, border:`1px solid ${GOLD}33`, borderRadius:16, padding:'20px 20px', marginBottom:20, textAlign:'center' }}>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:26, color:GOLD, letterSpacing:2, marginBottom:6 }}>QUEEN STAR</div>
          <div style={{ fontSize:13, color:MUTED, marginBottom:14 }}>Женская обувь · Душанбе · Доставка по городу</div>
          <div style={{ display:'flex', justifyContent:'center', gap:16 }}>
            {['👟 Широкий выбор','🚚 Доставка','💳 Наличные/Перевод'].map(t => (
              <div key={t} style={{ fontSize:11, color:CREAM }}>{t}</div>
            ))}
          </div>
        </div>

        {/* Search */}
        <div style={{ position:'relative', marginBottom:20 }}>
          <input style={{ ...S.input, paddingLeft:40 }} value={search} onChange={e => setSearch(e.target.value)} placeholder="Поиск по названию..."/>
          <span style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', fontSize:16, color:MUTED }}>🔍</span>
        </div>

        {/* Stats */}
        <div style={{ fontSize:12, color:MUTED, marginBottom:14 }}>{filtered.length} товаров в наличии</div>

        {/* Grid */}
        {filtered.length === 0 ? (
          <div style={{ textAlign:'center', padding:'40px 0', color:MUTED }}>
            <div style={{ fontSize:40, marginBottom:12 }}>😔</div>
            Товары не найдены
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            {filtered.map(product => (
              <ProductCard
                key={product.id}
                product={product}
                photo={photos[product.id]}
                onOrder={p => setOrderProduct(p)}
              />
            ))}
          </div>
        )}

        {/* Contact */}
        <div style={{ background:CARD, border:`1px solid ${BORD}`, borderRadius:14, padding:18, marginTop:24, textAlign:'center' }}>
          <div style={{ fontSize:14, fontWeight:700, color:GOLD, marginBottom:8 }}>Связаться с нами</div>
          <div style={{ fontSize:12, color:MUTED, marginBottom:12 }}>Instagram: @queenstar.shop</div>
          <div style={{ fontSize:11, color:MUTED }}>Душанбе, Таджикистан</div>
        </div>
      </div>
    </div>
  );
}
