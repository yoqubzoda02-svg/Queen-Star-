import { useState, useEffect } from "react";
import { db } from './firebase.js';
import { doc, getDoc, addDoc, collection, onSnapshot, query, where, setDoc, orderBy } from 'firebase/firestore';

// ── LIGHT THEME ───────────────────────────────────────────────
const BG    = '#F8F5F0';
const WHITE = '#FFFFFF';
const GOLD  = '#C9952A';
const GOLDD = '#A87820';
const DARK  = '#1A1210';
const MUTED = '#8A7A6A';
const BORD  = '#E8DDD0';
const GREEN = '#2E9B5C';
const RED   = '#D04040';
const BLUE  = '#3A7FCC';

const fmt = (n) => new Intl.NumberFormat('ru-RU').format(Math.round(n||0));
const nowStr = () => new Date().toISOString();

// ── STYLES ────────────────────────────────────────────────────
const S = {
  btn:   (c=GOLD) => ({ background:c, border:'none', borderRadius:12, padding:'14px 20px', color:c===GOLD?WHITE:WHITE, fontWeight:700, fontSize:15, cursor:'pointer', width:'100%', fontFamily:'inherit' }),
  btnSm: (c=GOLD) => ({ background:'none', border:`2px solid ${c}`, borderRadius:8, padding:'8px 14px', color:c, fontWeight:600, fontSize:13, cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap' }),
  input: { background:WHITE, border:`1.5px solid ${BORD}`, borderRadius:10, padding:'13px 14px', color:DARK, fontSize:15, width:'100%', outline:'none', boxSizing:'border-box', fontFamily:'inherit' },
  label: { fontSize:11, color:MUTED, letterSpacing:1.5, marginBottom:6, textTransform:'uppercase', display:'block' },
  card:  { background:WHITE, borderRadius:14, border:`1px solid ${BORD}`, overflow:'hidden', boxShadow:'0 2px 8px rgba(0,0,0,0.06)' },
};

// ── HEADER ────────────────────────────────────────────────────
function Header({ cartCount, onCart, onAccount, customer }) {
  return (
    <div style={{ background:WHITE, borderBottom:`1px solid ${BORD}`, padding:'14px 18px', display:'flex', justifyContent:'space-between', alignItems:'center', position:'sticky', top:0, zIndex:50, boxShadow:'0 2px 8px rgba(0,0,0,0.06)' }}>
      <div>
        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:20, color:GOLD, letterSpacing:3 }}>QUEEN STAR</div>
        <div style={{ fontSize:9, color:MUTED, letterSpacing:3, marginTop:1 }}>ДУШАНБЕ · ТАДЖИКИСТАН</div>
      </div>
      <div style={{ display:'flex', gap:8, alignItems:'center' }}>
        <button style={{ ...S.btnSm(MUTED), fontSize:12 }} onClick={onAccount}>
          {customer ? `👤 ${customer.name.split(' ')[0]}` : '👤 Войти'}
        </button>
        <button style={{ ...S.btnSm(GOLD), position:'relative', padding:'8px 12px' }} onClick={onCart}>
          🛒
          {cartCount > 0 && (
            <span style={{ position:'absolute', top:-8, right:-8, background:RED, color:WHITE, borderRadius:'50%', fontSize:11, fontWeight:700, width:20, height:20, display:'flex', alignItems:'center', justifyContent:'center' }}>
              {cartCount}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}

// ── CUSTOMER AUTH ─────────────────────────────────────────────
function AuthModal({ onClose, onLogin }) {
  const [step, setStep]   = useState('phone');
  const [phone, setPhone] = useState('+992');
  const [name, setName]   = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr]     = useState('');
  const [isNew, setIsNew] = useState(false);

  const checkPhone = async () => {
    if (phone.length < 10) { setErr('Введи полный номер'); return; }
    setLoading(true);
    try {
      const id = phone.replace(/\D/g,'');
      const snap = await getDoc(doc(db,'shop_customers',id));
      if (snap.exists()) {
        onLogin(snap.data());
        onClose();
      } else {
        setIsNew(true);
        setStep('name');
      }
    } catch { setErr('Ошибка. Попробуй снова.'); }
    setLoading(false);
  };

  const register = async () => {
    if (!name.trim()) { setErr('Введи имя'); return; }
    setLoading(true);
    try {
      const id = phone.replace(/\D/g,'');
      const customer = { id, name:name.trim(), phone, createdAt:nowStr() };
      await setDoc(doc(db,'shop_customers',id), customer);
      onLogin(customer);
      onClose();
    } catch { setErr('Ошибка регистрации.'); }
    setLoading(false);
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ background:WHITE, borderRadius:20, padding:24, maxWidth:340, width:'100%' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:18, color:GOLD }}>
            {step==='phone' ? 'Войти / Регистрация' : 'Создать аккаунт'}
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer', color:MUTED }}>✕</button>
        </div>

        {step==='phone' && (
          <>
            <div style={{ fontSize:13, color:MUTED, marginBottom:16 }}>
              Введи номер телефона. Если аккаунта нет — создадим автоматически.
            </div>
            <label style={S.label}>Номер телефона</label>
            <input style={{ ...S.input, marginBottom:12, fontSize:18, letterSpacing:1 }}
              value={phone} onChange={e=>{setPhone(e.target.value);setErr('');}}
              placeholder="+992 900 000000" type="tel"/>
            {err && <div style={{ fontSize:12, color:RED, marginBottom:8 }}>{err}</div>}
            <button style={S.btn()} onClick={checkPhone} disabled={loading}>
              {loading ? 'Проверяем...' : 'Продолжить →'}
            </button>
          </>
        )}

        {step==='name' && (
          <>
            <div style={{ background:BG, borderRadius:10, padding:12, marginBottom:16, fontSize:13, color:MUTED }}>
              📱 {phone}
            </div>
            <div style={{ fontSize:13, color:MUTED, marginBottom:16 }}>Первый раз? Введи своё имя:</div>
            <label style={S.label}>Твоё имя</label>
            <input style={{ ...S.input, marginBottom:12 }}
              value={name} onChange={e=>{setName(e.target.value);setErr('');}}
              placeholder="Зарина, Малика..." autoFocus/>
            {err && <div style={{ fontSize:12, color:RED, marginBottom:8 }}>{err}</div>}
            <button style={S.btn()} onClick={register} disabled={loading}>
              {loading ? 'Создаём аккаунт...' : '✓ Создать аккаунт'}
            </button>
            <button style={{ ...S.btn(WHITE), color:MUTED, border:`1px solid ${BORD}`, marginTop:8 }} onClick={()=>setStep('phone')}>
              ← Назад
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── ACCOUNT PAGE ──────────────────────────────────────────────
function AccountPage({ customer, onClose, onLogout }) {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    if (!customer) return;
    const q = query(collection(db,'shop_orders'), where('customerPhone','==',customer.phone));
    const unsub = onSnapshot(q, snap => {
      const list = snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>new Date(b.date)-new Date(a.date));
      setOrders(list);
    });
    return () => unsub();
  }, [customer]);

  const STATUS = {
    new:      { l:'Принят', c:GOLD },
    delivery: { l:'В доставке 🚚', c:BLUE },
    done:     { l:'Получен ✓', c:GREEN },
    cancelled:{ l:'Отменён', c:RED },
  };

  return (
    <div style={{ position:'fixed', inset:0, background:BG, zIndex:200, overflowY:'auto' }}>
      <div style={{ padding:'16px 16px 80px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:22, cursor:'pointer', color:DARK }}>←</button>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:18, color:GOLD }}>Мой аккаунт</div>
          <button onClick={onLogout} style={{ ...S.btnSm(RED), fontSize:11 }}>Выйти</button>
        </div>

        <div style={{ ...S.card, padding:16, marginBottom:20 }}>
          <div style={{ fontSize:20, fontWeight:700, color:DARK }}>{customer.name}</div>
          <div style={{ fontSize:13, color:MUTED, marginTop:4 }}>📞 {customer.phone}</div>
          <div style={{ display:'flex', gap:16, marginTop:12 }}>
            <div style={{ textAlign:'center' }}>
              <div style={{ fontSize:22, fontWeight:700, color:GOLD }}>{orders.length}</div>
              <div style={{ fontSize:11, color:MUTED }}>заказов</div>
            </div>
            <div style={{ textAlign:'center' }}>
              <div style={{ fontSize:22, fontWeight:700, color:GREEN }}>{fmt(orders.filter(o=>o.status==='done').reduce((s,o)=>s+o.total,0))}</div>
              <div style={{ fontSize:11, color:MUTED }}>сом потрачено</div>
            </div>
          </div>
        </div>

        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:16, color:DARK, marginBottom:12 }}>История заказов</div>

        {orders.length === 0 ? (
          <div style={{ textAlign:'center', padding:'40px 0', color:MUTED }}>
            <div style={{ fontSize:40, marginBottom:12 }}>📦</div>
            Заказов пока нет
          </div>
        ) : orders.map(o => {
          const st = STATUS[o.status] || STATUS.new;
          return (
            <div key={o.id} style={{ ...S.card, padding:16, marginBottom:12 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                <div style={{ fontSize:14, fontWeight:700, color:DARK }}>{o.productName}</div>
                <div style={{ fontSize:16, fontWeight:700, color:GOLD }}>{fmt(o.total)} сом</div>
              </div>
              <div style={{ fontSize:12, color:MUTED, marginBottom:8 }}>
                Размер: {o.size} · {o.qty} шт · {new Date(o.date).toLocaleDateString('ru-RU')}
              </div>
              <div style={{ background:st.c+'15', border:`1px solid ${st.c}44`, borderRadius:8, padding:'6px 12px', fontSize:13, fontWeight:600, color:st.c, display:'inline-block' }}>
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
function CartPage({ cart, onClose, onCheckout, onRemove, customer, onNeedAuth }) {
  const total = cart.reduce((s,x)=>s+x.total, 0);

  return (
    <div style={{ position:'fixed', inset:0, background:BG, zIndex:200, overflowY:'auto' }}>
      <div style={{ padding:'16px 16px 120px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:22, cursor:'pointer', color:DARK }}>←</button>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:18, color:DARK }}>Корзина ({cart.length})</div>
        </div>

        {cart.length === 0 ? (
          <div style={{ textAlign:'center', padding:'60px 0', color:MUTED }}>
            <div style={{ fontSize:50, marginBottom:14 }}>🛒</div>
            <div style={{ fontSize:16, fontWeight:600, color:DARK, marginBottom:8 }}>Корзина пуста</div>
            <div style={{ fontSize:13 }}>Добавь товары из каталога</div>
          </div>
        ) : (
          <>
            {cart.map((item,i) => (
              <div key={i} style={{ ...S.card, padding:14, marginBottom:10, display:'flex', gap:12 }}>
                {item.photo && <img src={item.photo} style={{ width:70, height:70, borderRadius:10, objectFit:'cover', flexShrink:0 }}/>}
                {!item.photo && <div style={{ width:70, height:70, borderRadius:10, background:BG, display:'flex', alignItems:'center', justifyContent:'center', fontSize:28, flexShrink:0 }}>👟</div>}
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:14, fontWeight:700, color:DARK }}>{item.name}</div>
                  <div style={{ fontSize:12, color:MUTED, marginTop:3 }}>Размер: {item.size} · {item.qty} шт</div>
                  <div style={{ fontSize:16, fontWeight:700, color:GOLD, marginTop:4 }}>{fmt(item.total)} сом</div>
                </div>
                <button onClick={()=>onRemove(i)} style={{ background:'none', border:'none', color:RED, fontSize:18, cursor:'pointer', alignSelf:'flex-start' }}>✕</button>
              </div>
            ))}
          </>
        )}
      </div>

      {cart.length > 0 && (
        <div style={{ position:'fixed', bottom:0, left:0, right:0, background:WHITE, borderTop:`1px solid ${BORD}`, padding:16, boxShadow:'0 -4px 20px rgba(0,0,0,0.08)' }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:12 }}>
            <div style={{ fontSize:15, color:MUTED }}>Итого</div>
            <div style={{ fontSize:22, fontWeight:700, color:GOLD }}>{fmt(total)} сом</div>
          </div>
          <button style={S.btn()} onClick={customer ? onCheckout : onNeedAuth}>
            {customer ? 'Оформить заказ →' : 'Войти и оформить →'}
          </button>
        </div>
      )}
    </div>
  );
}

// ── ORDER FORM ────────────────────────────────────────────────
function OrderForm({ cart, customer, onClose, onSuccess }) {
  const [address, setAddress] = useState('');
  const [payment, setPayment] = useState('cash');
  const [note, setNote]       = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr]         = useState('');

  const total = cart.reduce((s,x)=>s+x.total,0);

  const submit = async () => {
    setLoading(true); setErr('');
    try {
      const orders = cart.map(item => ({
        customerName:  customer.name,
        customerPhone: customer.phone,
        customerId:    customer.id,
        productId:     item.id,
        productName:   item.name,
        qty:           item.qty,
        price:         item.price,
        total:         item.total,
        size:          item.size,
        address:       address.trim(),
        payment,
        note:          note.trim(),
        status:        'new',
        source:        'shop',
        date:          nowStr(),
      }));
      await Promise.all(orders.map(o => addDoc(collection(db,'shop_orders'), o)));
      onSuccess();
    } catch(e) {
      setErr('Ошибка. Попробуй снова.');
      console.error(e);
    }
    setLoading(false);
  };

  return (
    <div style={{ position:'fixed', inset:0, background:BG, zIndex:300, overflowY:'auto' }}>
      <div style={{ padding:'16px 16px 100px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:22, cursor:'pointer', color:DARK }}>←</button>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:18, color:DARK }}>Оформление заказа</div>
        </div>

        {/* Customer info */}
        <div style={{ ...S.card, padding:14, marginBottom:16, display:'flex', gap:12, alignItems:'center' }}>
          <div style={{ width:40, height:40, borderRadius:'50%', background:GOLD+'22', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>👤</div>
          <div>
            <div style={{ fontWeight:700, color:DARK }}>{customer.name}</div>
            <div style={{ fontSize:12, color:MUTED }}>{customer.phone}</div>
          </div>
        </div>

        {/* Order summary */}
        <div style={{ ...S.card, padding:14, marginBottom:16 }}>
          <div style={{ fontSize:12, color:MUTED, marginBottom:10, letterSpacing:1, textTransform:'uppercase' }}>Ваш заказ</div>
          {cart.map((item,i) => (
            <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:`1px solid ${BORD}` }}>
              <div style={{ fontSize:13, color:DARK }}>{item.name} (р.{item.size}) × {item.qty}</div>
              <div style={{ fontWeight:600, color:GOLD }}>{fmt(item.total)}</div>
            </div>
          ))}
          <div style={{ display:'flex', justifyContent:'space-between', marginTop:10 }}>
            <div style={{ fontWeight:700, color:DARK }}>Итого</div>
            <div style={{ fontSize:18, fontWeight:700, color:GOLD }}>{fmt(total)} сом</div>
          </div>
        </div>

        <div style={{ marginBottom:14 }}>
          <label style={S.label}>Адрес доставки</label>
          <input style={S.input} value={address} onChange={e=>setAddress(e.target.value)} placeholder="ул. Рудаки 10, кв. 5"/>
        </div>

        {/* Payment */}
        <div style={{ marginBottom:14 }}>
          <label style={S.label}>Оплата</label>
          <div style={{ display:'flex', gap:10 }}>
            {[{v:'cash',l:'💵 Наличные'},{v:'transfer',l:'📲 Перевод'}].map(opt=>(
              <div key={opt.v} onClick={()=>setPayment(opt.v)}
                style={{ flex:1, padding:'12px', textAlign:'center', borderRadius:10, cursor:'pointer', fontSize:13, fontWeight:600,
                  background:payment===opt.v?GOLD:WHITE, color:payment===opt.v?WHITE:MUTED,
                  border:`2px solid ${payment===opt.v?GOLD:BORD}` }}>
                {opt.l}
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginBottom:20 }}>
          <label style={S.label}>Заметка</label>
          <input style={S.input} value={note} onChange={e=>setNote(e.target.value)} placeholder="Особые пожелания..."/>
        </div>

        {err && <div style={{ fontSize:13, color:RED, marginBottom:10, textAlign:'center' }}>{err}</div>}
      </div>

      <div style={{ position:'fixed', bottom:0, left:0, right:0, padding:16, background:WHITE, borderTop:`1px solid ${BORD}` }}>
        <button style={S.btn()} onClick={submit} disabled={loading}>
          {loading ? 'Оформляем...' : `Подтвердить заказ — ${fmt(total)} сом`}
        </button>
      </div>
    </div>
  );
}

// ── SUCCESS ───────────────────────────────────────────────────
function SuccessPage({ onClose }) {
  return (
    <div style={{ position:'fixed', inset:0, background:BG, zIndex:400, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:24 }}>
      <div style={{ fontSize:72, marginBottom:20 }}>🎉</div>
      <div style={{ fontFamily:"'Playfair Display',serif", fontSize:26, color:DARK, marginBottom:12, textAlign:'center' }}>Заказ принят!</div>
      <div style={{ fontSize:14, color:MUTED, textAlign:'center', marginBottom:30, lineHeight:1.8 }}>
        Мы свяжемся с вами в течение 30 минут<br/>для подтверждения заказа
      </div>
      <div style={{ ...S.card, padding:16, marginBottom:24, width:'100%', maxWidth:320, textAlign:'center' }}>
        <div style={{ fontSize:13, color:MUTED }}>Следи за статусом в</div>
        <div style={{ fontSize:15, fontWeight:700, color:GOLD, marginTop:4 }}>👤 Мой аккаунт → История заказов</div>
      </div>
      <button style={{ ...S.btn(GOLD), maxWidth:320, width:'100%' }} onClick={onClose}>← Вернуться в каталог</button>
    </div>
  );
}

// ── PRODUCT CARD ──────────────────────────────────────────────
function ProductCard({ product, photo, onAddToCart }) {
  const [size, setSize] = useState('');
  const [showSizes, setShowSizes] = useState(false);
  const SIZES = ['36','37','38','39','40','41','42'];

  const addToCart = () => {
    if (!size) { setShowSizes(true); return; }
    onAddToCart({ ...product, photo, size, qty:1, total:product.price });
    setSize(''); setShowSizes(false);
  };

  return (
    <div style={{ ...S.card }}>
      <div style={{ height:180, background:BG, position:'relative', overflow:'hidden' }}>
        {photo
          ? <img src={photo} alt={product.name} style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
          : <div style={{ height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:54 }}>👟</div>
        }
        <div style={{ position:'absolute', top:8, right:8, background:GREEN, color:WHITE, borderRadius:6, padding:'3px 8px', fontSize:11, fontWeight:700 }}>
          В наличии
        </div>
      </div>
      <div style={{ padding:12 }}>
        <div style={{ fontSize:11, color:GOLD, letterSpacing:1, marginBottom:3 }}>{product.id}</div>
        <div style={{ fontSize:14, fontWeight:700, color:DARK, marginBottom:6 }}>{product.name}</div>
        <div style={{ fontSize:20, fontWeight:700, color:GOLD, marginBottom:10 }}>{fmt(product.price)} сом</div>

        {showSizes && (
          <div style={{ marginBottom:10 }}>
            <div style={{ fontSize:11, color:MUTED, marginBottom:6 }}>Выбери размер:</div>
            <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
              {SIZES.map(s=>(
                <div key={s} onClick={()=>setSize(s)}
                  style={{ padding:'6px 10px', borderRadius:6, cursor:'pointer', fontSize:13, fontWeight:600,
                    background:size===s?GOLD:BG, color:size===s?WHITE:DARK,
                    border:`1.5px solid ${size===s?GOLD:BORD}` }}>
                  {s}
                </div>
              ))}
            </div>
          </div>
        )}

        <button style={{ ...S.btn(GOLD), padding:'10px 16px', fontSize:13 }} onClick={addToCart}>
          {showSizes && !size ? '👆 Выбери размер' : '🛒 В корзину'}
        </button>
      </div>
    </div>
  );
}

// ── MAIN APP ─────────────────────────────────────────────────
export default function ShopApp() {
  const [products, setProducts] = useState([]);
  const [photos, setPhotos]     = useState({});
  const [loading, setLoading]   = useState(true);
  const [cart, setCart]         = useState([]);
  const [screen, setScreen]     = useState('catalog');
  const [customer, setCustomer] = useState(null);
  const [showAuth, setShowAuth] = useState(false);
  const [showOrder, setShowOrder] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [search, setSearch]     = useState('');

  // Load saved customer from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('qs_customer');
      if (saved) setCustomer(JSON.parse(saved));
    } catch {}
  }, []);

  // Load products from Firebase
  useEffect(() => {
    const load = async () => {
      try {
        const [ps, ph] = await Promise.all([
          getDoc(doc(db,'qs','products')),
          getDoc(doc(db,'qs','photos')),
        ]);
        if (ps.exists()) {
          const all = JSON.parse(ps.data().v);
          setProducts(all.filter(p=>!p.transit&&(p.qty-(p.reserved||0))>0));
        }
        if (ph.exists()) setPhotos(JSON.parse(ph.data().v));
      } catch(e) { console.error(e); }
      setLoading(false);
    };
    load();
    const unsub = onSnapshot(doc(db,'qs','products'), snap=>{
      if(snap.exists()) try {
        const all = JSON.parse(snap.data().v);
        setProducts(all.filter(p=>!p.transit&&(p.qty-(p.reserved||0))>0));
      } catch {}
    });
    return ()=>unsub();
  }, []);

  const login = (cust) => {
    setCustomer(cust);
    try { localStorage.setItem('qs_customer', JSON.stringify(cust)); } catch {}
  };

  const logout = () => {
    setCustomer(null);
    try { localStorage.removeItem('qs_customer'); } catch {}
    setScreen('catalog');
  };

  const addToCart = (item) => {
    setCart(prev=>[...prev, item]);
  };

  const removeFromCart = (i) => setCart(prev=>prev.filter((_,idx)=>idx!==i));

  const checkout = () => { setScreen('catalog'); setShowOrder(true); };

  const onOrderSuccess = () => {
    setCart([]);
    setShowOrder(false);
    setShowSuccess(true);
  };

  const filtered = products.filter(p=>
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
    <div style={{ background:BG, minHeight:'100vh', color:DARK, fontFamily:"'DM Sans',sans-serif", paddingBottom:20 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,600;9..40,700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        input::placeholder{color:#C0B0A0;}
        input:focus{border-color:${GOLD}!important;outline:none;}
        button:disabled{opacity:0.6;}
      `}</style>

      <Header cartCount={cart.length} onCart={()=>setScreen('cart')} onAccount={()=>customer?setScreen('account'):setShowAuth(true)} customer={customer}/>

      {/* Modals */}
      {showAuth && <AuthModal onClose={()=>setShowAuth(false)} onLogin={login}/>}
      {showSuccess && <SuccessPage onClose={()=>setShowSuccess(false)}/>}
      {showOrder && customer && <OrderForm cart={cart} customer={customer} onClose={()=>setShowOrder(false)} onSuccess={onOrderSuccess}/>}

      {/* Screens */}
      {screen==='cart' && <CartPage cart={cart} onClose={()=>setScreen('catalog')} onCheckout={checkout} onRemove={removeFromCart} customer={customer} onNeedAuth={()=>{setScreen('catalog');setShowAuth(true);}}/>}
      {screen==='account' && customer && <AccountPage customer={customer} onClose={()=>setScreen('catalog')} onLogout={logout}/>}

      {/* Catalog */}
      {screen==='catalog' && (
        <div style={{ padding:'16px 14px' }}>
          {/* Banner */}
          <div style={{ background:`linear-gradient(135deg, ${GOLD}, ${GOLDD})`, borderRadius:16, padding:'20px', marginBottom:20, color:WHITE, textAlign:'center' }}>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:24, letterSpacing:2, marginBottom:6 }}>QUEEN STAR</div>
            <div style={{ fontSize:13, opacity:0.85, marginBottom:14 }}>Женская обувь · Душанбе · Доставка по городу</div>
            <div style={{ display:'flex', justifyContent:'center', gap:20 }}>
              {['🚚 Быстрая доставка','💳 Нал / Перевод','📦 Возврат 7 дней'].map(t=>(
                <div key={t} style={{ fontSize:11, opacity:0.9 }}>{t}</div>
              ))}
            </div>
          </div>

          {/* Search */}
          <div style={{ position:'relative', marginBottom:16 }}>
            <input style={{ ...S.input, paddingLeft:42, background:WHITE }} value={search} onChange={e=>setSearch(e.target.value)} placeholder="Поиск товаров..."/>
            <span style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', fontSize:16, color:MUTED }}>🔍</span>
          </div>

          <div style={{ fontSize:12, color:MUTED, marginBottom:14 }}>{filtered.length} товаров в наличии</div>

          {filtered.length===0 ? (
            <div style={{ textAlign:'center', padding:'40px 0', color:MUTED }}>
              <div style={{ fontSize:40, marginBottom:12 }}>😔</div>
              Ничего не найдено
            </div>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              {filtered.map(p=>(
                <ProductCard key={p.id} product={p} photo={photos[p.id]} onAddToCart={addToCart}/>
              ))}
            </div>
          )}

          {/* Contact */}
          <div style={{ ...S.card, padding:18, marginTop:24, textAlign:'center' }}>
            <div style={{ fontSize:15, fontWeight:700, color:DARK, marginBottom:8 }}>Связаться с нами</div>
            <div style={{ fontSize:13, color:MUTED }}>Instagram: @queenstar.shop</div>
            <div style={{ fontSize:12, color:MUTED, marginTop:4 }}>Душанбе, Таджикистан</div>
          </div>
        </div>
      )}
    </div>
  );
}
