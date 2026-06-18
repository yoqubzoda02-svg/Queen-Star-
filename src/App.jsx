import { useState, useEffect, useRef } from "react";
import { db } from './firebase.js';
import { doc, getDoc, addDoc, collection, onSnapshot, query, where, setDoc, orderBy, getDocs } from 'firebase/firestore';

// ── THEME ─────────────────────────────────────────────────────
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

const S = {
  btn:   (c=GOLD)=>({ background:c, border:'none', borderRadius:12, padding:'14px 20px', color:WHITE, fontWeight:700, fontSize:15, cursor:'pointer', width:'100%', fontFamily:'inherit' }),
  btnSm: (c=GOLD)=>({ background:'none', border:`2px solid ${c}`, borderRadius:8, padding:'8px 14px', color:c, fontWeight:600, fontSize:13, cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap' }),
  input: { background:WHITE, border:`1.5px solid ${BORD}`, borderRadius:10, padding:'13px 14px', color:DARK, fontSize:15, width:'100%', outline:'none', boxSizing:'border-box', fontFamily:'inherit' },
  label: { fontSize:11, color:MUTED, letterSpacing:1.5, marginBottom:6, textTransform:'uppercase', display:'block' },
  card:  { background:WHITE, borderRadius:14, border:`1px solid ${BORD}`, overflow:'hidden', boxShadow:'0 2px 8px rgba(0,0,0,0.06)' },
};

// ── SIZE GUIDE ────────────────────────────────────────────────
const SIZE_GUIDE = [
  {size:'36', cm:'22.5'}, {size:'37', cm:'23.5'}, {size:'38', cm:'24.5'},
  {size:'39', cm:'25.0'}, {size:'40', cm:'26.0'}, {size:'41', cm:'26.5'}, {size:'42', cm:'27.5'},
];

function SizeGuideModal({ onClose }) {
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:400, display:'flex', alignItems:'flex-end', justifyContent:'center' }}>
      <div style={{ background:WHITE, borderRadius:'20px 20px 0 0', padding:24, width:'100%', maxWidth:480 }}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:20 }}>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:18, color:DARK }}>📏 Таблица размеров</div>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer', color:MUTED }}>✕</button>
        </div>
        <div style={{ fontSize:13, color:MUTED, marginBottom:14 }}>
          Измерь длину стопы и выбери подходящий размер:
        </div>
        <div style={{ background:BG, borderRadius:10, overflow:'hidden' }}>
          <div style={{ display:'flex', background:GOLD, color:WHITE, padding:'10px 16px', fontWeight:700, fontSize:13 }}>
            <div style={{ flex:1 }}>Размер EU</div>
            <div style={{ flex:1 }}>Длина стопы</div>
          </div>
          {SIZE_GUIDE.map((r,i)=>(
            <div key={r.size} style={{ display:'flex', padding:'10px 16px', background:i%2===0?WHITE:BG, fontSize:14 }}>
              <div style={{ flex:1, fontWeight:600, color:GOLD }}>{r.size}</div>
              <div style={{ flex:1, color:DARK }}>{r.cm} см</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize:12, color:MUTED, marginTop:12, textAlign:'center' }}>
          Если между размерами — выбирай больший
        </div>
        <button style={{ ...S.btn(GOLD), marginTop:16 }} onClick={onClose}>Понятно</button>
      </div>
    </div>
  );
}

// ── TOAST ─────────────────────────────────────────────────────
function Toast({ toasts }) {
  if (!toasts.length) return null;
  return (
    <div style={{ position:'fixed', top:70, left:0, right:0, zIndex:999, padding:'0 14px', pointerEvents:'none' }}>
      {toasts.map(t=>(
        <div key={t.id} style={{ background:t.color||GOLD, color:WHITE, borderRadius:10, padding:'12px 16px', marginBottom:8, fontSize:13, fontWeight:600, boxShadow:'0 4px 16px rgba(0,0,0,0.15)' }}>
          {t.msg}
        </div>
      ))}
    </div>
  );
}

// ── HEADER ────────────────────────────────────────────────────
function Header({ cartCount, favCount, onCart, onAccount, onFav, customer, lang, setLang }) {
  return (
    <div style={{ background:WHITE, borderBottom:`1px solid ${BORD}`, padding:'13px 16px', display:'flex', justifyContent:'space-between', alignItems:'center', position:'sticky', top:0, zIndex:50, boxShadow:'0 2px 8px rgba(0,0,0,0.06)' }}>
      <div>
        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:19, color:GOLD, letterSpacing:3 }}>QUEEN STAR</div>
        <div style={{ fontSize:9, color:MUTED, letterSpacing:3, marginTop:1 }}>ДУШАНБЕ · ТАДЖИКИСТАН</div>
      </div>
      <div style={{ display:'flex', gap:6, alignItems:'center' }}>
        <button onClick={()=>{const n=lang==='ru'?'tj':'ru';setLang(n);try{localStorage.setItem('qs_lang',n);}catch{}}}
          style={{ background:'none', border:`1.5px solid ${BORD}`, borderRadius:6, padding:'5px 8px', fontSize:11, fontWeight:700, cursor:'pointer', color:GOLD }}>
          {lang==='ru'?'ТЧ':'RU'}
        </button>
        <button style={{ ...S.btnSm(MUTED), padding:'7px 10px', position:'relative' }} onClick={onFav}>
          ❤️ {favCount>0 && <span style={{ fontSize:10, fontWeight:700 }}>{favCount}</span>}
        </button>
        <button style={{ ...S.btnSm(MUTED), padding:'7px 10px' }} onClick={onAccount}>
          {customer ? `👤 ${customer.name.split(' ')[0]}` : '👤'}
        </button>
        <button style={{ background:GOLD, border:'none', borderRadius:8, padding:'8px 12px', color:WHITE, cursor:'pointer', position:'relative', fontSize:16 }} onClick={onCart}>
          🛒
          {cartCount>0 && <span style={{ position:'absolute', top:-8, right:-8, background:RED, color:WHITE, borderRadius:'50%', fontSize:10, fontWeight:700, width:18, height:18, display:'flex', alignItems:'center', justifyContent:'center' }}>{cartCount}</span>}
        </button>
      </div>
    </div>
  );
}

// ── AUTH ──────────────────────────────────────────────────────
function AuthModal({ onClose, onLogin }) {
  const [step, setStep]   = useState('phone');
  const [phone, setPhone] = useState('+992');
  const [name, setName]   = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr]     = useState('');

  const check = async () => {
    if (phone.length < 10) { setErr('Введи полный номер'); return; }
    setLoading(true);
    try {
      const id = phone.replace(/\D/g,'');
      const snap = await getDoc(doc(db,'shop_customers',id));
      if (snap.exists()) { onLogin(snap.data()); onClose(); }
      else setStep('name');
    } catch { setErr('Ошибка. Попробуй снова.'); }
    setLoading(false);
  };

  const register = async () => {
    if (!name.trim()) { setErr('Введи имя'); return; }
    setLoading(true);
    try {
      const id = phone.replace(/\D/g,'');
      const c = { id, name:name.trim(), phone, createdAt:nowStr() };
      await setDoc(doc(db,'shop_customers',id), c);
      onLogin(c); onClose();
    } catch { setErr('Ошибка регистрации.'); }
    setLoading(false);
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:300, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ background:WHITE, borderRadius:20, padding:24, maxWidth:340, width:'100%' }}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:18 }}>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:17, color:GOLD }}>{step==='phone'?'Войти / Регистрация':'Создать аккаунт'}</div>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer', color:MUTED }}>✕</button>
        </div>
        {step==='phone'&&(<>
          <div style={{ fontSize:13, color:MUTED, marginBottom:14 }}>Введи номер — войдём или создадим аккаунт</div>
          <label style={S.label}>Номер телефона</label>
          <input style={{ ...S.input, marginBottom:12, fontSize:18, letterSpacing:1 }} value={phone} onChange={e=>{setPhone(e.target.value);setErr('');}} placeholder="+992 900 000000" type="tel"/>
          {err&&<div style={{ fontSize:12, color:RED, marginBottom:8 }}>{err}</div>}
          <button style={S.btn()} onClick={check} disabled={loading}>{loading?'Проверяем...':'Продолжить →'}</button>
        </>)}
        {step==='name'&&(<>
          <div style={{ background:BG, borderRadius:8, padding:10, marginBottom:14, fontSize:13, color:MUTED }}>📱 {phone}</div>
          <label style={S.label}>Твоё имя</label>
          <input style={{ ...S.input, marginBottom:12 }} value={name} onChange={e=>{setName(e.target.value);setErr('');}} placeholder="Зарина, Малика..." autoFocus/>
          {err&&<div style={{ fontSize:12, color:RED, marginBottom:8 }}>{err}</div>}
          <button style={S.btn()} onClick={register} disabled={loading}>{loading?'Создаём...':'✓ Создать аккаунт'}</button>
          <button style={{ ...S.btn(WHITE), color:MUTED, border:`1px solid ${BORD}`, marginTop:8 }} onClick={()=>setStep('phone')}>← Назад</button>
        </>)}
      </div>
    </div>
  );
}

// ── REVIEWS ───────────────────────────────────────────────────
function ReviewsSection({ productId }) {
  const [reviews, setReviews] = useState([]);
  const [show, setShow]       = useState(false);

  useEffect(()=>{
    const q = query(collection(db,'reviews'), where('productId','==',productId));
    const unsub = onSnapshot(q, snap=>{
      setReviews(snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>new Date(b.date)-new Date(a.date)));
    });
    return()=>unsub();
  },[productId]);

  const avg = reviews.length ? (reviews.reduce((s,r)=>s+r.rating,0)/reviews.length).toFixed(1) : null;

  return (
    <div style={{ padding:'12px 14px', borderTop:`1px solid ${BORD}` }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
        <div style={{ fontSize:13, fontWeight:600, color:DARK }}>
          {avg ? `⭐ ${avg} (${reviews.length})` : '📝 Отзывов нет'}
        </div>
        {reviews.length>0 && <button style={{ ...S.btnSm(MUTED), fontSize:11, padding:'4px 10px' }} onClick={()=>setShow(!show)}>{show?'Скрыть':'Смотреть'}</button>}
      </div>
      {show && reviews.slice(0,3).map(r=>(
        <div key={r.id} style={{ background:BG, borderRadius:8, padding:10, marginBottom:6 }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
            <div style={{ fontSize:12, fontWeight:600, color:DARK }}>{r.customerName}</div>
            <div style={{ fontSize:12, color:GOLD }}>{'⭐'.repeat(r.rating)}</div>
          </div>
          {r.text && <div style={{ fontSize:12, color:MUTED }}>{r.text}</div>}
        </div>
      ))}
    </div>
  );
}

function LeaveReview({ order, customer, onClose }) {
  const [rating, setRating] = useState(5);
  const [text, setText]     = useState('');
  const [done, setDone]     = useState(false);

  const submit = async () => {
    await addDoc(collection(db,'reviews'),{
      productId:order.productId, productName:order.productName,
      customerId:customer.id, customerName:customer.name,
      rating, text:text.trim(), date:nowStr()
    });
    setDone(true);
  };

  if (done) return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:400, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ background:WHITE, borderRadius:20, padding:24, maxWidth:340, width:'100%', textAlign:'center' }}>
        <div style={{ fontSize:48, marginBottom:12 }}>🎉</div>
        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:18, color:DARK, marginBottom:8 }}>Спасибо за отзыв!</div>
        <button style={{ ...S.btn(GOLD), marginTop:14 }} onClick={onClose}>Закрыть</button>
      </div>
    </div>
  );

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:400, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ background:WHITE, borderRadius:20, padding:24, maxWidth:340, width:'100%' }}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:16 }}>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:17, color:DARK }}>Оставить отзыв</div>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer', color:MUTED }}>✕</button>
        </div>
        <div style={{ fontSize:14, color:MUTED, marginBottom:14 }}>{order.productName}</div>
        <div style={{ display:'flex', gap:6, marginBottom:16 }}>
          {[1,2,3,4,5].map(s=>(
            <div key={s} onClick={()=>setRating(s)} style={{ fontSize:28, cursor:'pointer', opacity:s<=rating?1:0.3 }}>⭐</div>
          ))}
        </div>
        <textarea value={text} onChange={e=>setText(e.target.value)} placeholder="Расскажи о товаре..."
          style={{ ...S.input, minHeight:80, resize:'vertical', marginBottom:14 }}/>
        <button style={S.btn()} onClick={submit}>Отправить отзыв</button>
      </div>
    </div>
  );
}

// ── ACCOUNT PAGE ──────────────────────────────────────────────
function AccountPage({ customer, onClose, onLogout }) {
  const [orders, setOrders]     = useState([]);
  const [reviewFor, setReviewFor] = useState(null);
  const prevStatuses = useRef({});
  const [toasts, setToasts]     = useState([]);

  const addToast = (msg, color=GREEN) => {
    const id = Date.now();
    setToasts(p=>[...p,{id,msg,color}]);
    setTimeout(()=>setToasts(p=>p.filter(t=>t.id!==id)),4000);
  };

  useEffect(()=>{
    if(!customer) return;
    const q = query(collection(db,'shop_orders'), where('customerPhone','==',customer.phone));
    const unsub = onSnapshot(q, snap=>{
      const list = snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>new Date(b.date)-new Date(a.date));
      list.forEach(o=>{
        if(prevStatuses.current[o.id] && prevStatuses.current[o.id]!==o.status){
          if(o.status==='delivery') addToast('🚚 Ваш заказ выехал!', BLUE);
          if(o.status==='done')     addToast('✅ Заказ доставлен! Оцените товар', GREEN);
        }
        prevStatuses.current[o.id] = o.status;
      });
      setOrders(list);
    });
    return()=>unsub();
  },[customer]);

  const ST = {
    new:{l:'Принят ✓',c:GOLD}, delivery:{l:'В доставке 🚚',c:BLUE},
    done:{l:'Получен ✓',c:GREEN}, cancelled:{l:'Отменён',c:RED}
  };

  return (
    <div style={{ position:'fixed', inset:0, background:BG, zIndex:200, overflowY:'auto' }}>
      <Toast toasts={toasts}/>
      {reviewFor && <LeaveReview order={reviewFor} customer={customer} onClose={()=>setReviewFor(null)}/>}
      <div style={{ padding:'16px 16px 80px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:22, cursor:'pointer', color:DARK }}>←</button>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:18, color:GOLD }}>Мой аккаунт</div>
          <button onClick={onLogout} style={{ ...S.btnSm(RED), fontSize:11 }}>Выйти</button>
        </div>
        <div style={{ ...S.card, padding:16, marginBottom:20 }}>
          <div style={{ fontSize:20, fontWeight:700, color:DARK }}>{customer.name}</div>
          <div style={{ fontSize:13, color:MUTED, marginTop:4 }}>📞 {customer.phone}</div>
          <div style={{ display:'flex', gap:20, marginTop:14 }}>
            <div style={{ textAlign:'center' }}>
              <div style={{ fontSize:24, fontWeight:700, color:GOLD }}>{orders.length}</div>
              <div style={{ fontSize:11, color:MUTED }}>заказов</div>
            </div>
            <div style={{ textAlign:'center' }}>
              <div style={{ fontSize:24, fontWeight:700, color:GREEN }}>{fmt(orders.filter(o=>o.status==='done').reduce((s,o)=>s+o.total,0))}</div>
              <div style={{ fontSize:11, color:MUTED }}>сом потрачено</div>
            </div>
          </div>
        </div>
        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:16, color:DARK, marginBottom:12 }}>История заказов</div>
        {orders.length===0 ? (
          <div style={{ textAlign:'center', padding:'40px 0', color:MUTED }}>
            <div style={{ fontSize:40, marginBottom:12 }}>📦</div>
            Заказов пока нет
          </div>
        ) : orders.map(o=>{
          const st = ST[o.status]||ST.new;
          return (
            <div key={o.id} style={{ ...S.card, padding:14, marginBottom:12 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                <div style={{ fontSize:14, fontWeight:700, color:DARK }}>{o.productName}</div>
                <div style={{ fontSize:16, fontWeight:700, color:GOLD }}>{fmt(o.total)} сом</div>
              </div>
              <div style={{ fontSize:12, color:MUTED, marginBottom:8 }}>р.{o.size} · {o.qty} шт · {new Date(o.date).toLocaleDateString('ru-RU')}</div>
              <div style={{ background:st.c+'15', border:`1px solid ${st.c}44`, borderRadius:8, padding:'6px 12px', fontSize:13, fontWeight:600, color:st.c, display:'inline-block', marginBottom: o.status==='done'?8:0 }}>
                {st.l}
              </div>
              {o.status==='done' && (
                <button style={{ ...S.btnSm(GOLD), display:'block', marginTop:8, width:'100%', textAlign:'center' }} onClick={()=>setReviewFor(o)}>
                  ⭐ Оставить отзыв
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── CART ──────────────────────────────────────────────────────
function CartPage({ cart, onClose, onCheckout, onRemove, customer, onNeedAuth }) {
  const [promo, setPromo]     = useState('');
  const [discount, setDiscount] = useState(0);
  const [promoMsg, setPromoMsg] = useState('');

  const subtotal = cart.reduce((s,x)=>s+x.total,0);
  const total = Math.round(subtotal * (1 - discount/100));

  const applyPromo = async () => {
    try {
      const snap = await getDoc(doc(db,'qs','promo_codes'));
      if(snap.exists()){
        const codes = JSON.parse(snap.data().v||'{}');
        const code = codes[promo.toUpperCase().trim()];
        if(code){ setDiscount(code); setPromoMsg(`✅ Скидка ${code}% применена!`); }
        else { setPromoMsg('❌ Промокод не найден'); setDiscount(0); }
      } else { setPromoMsg('❌ Промокод не найден'); }
    } catch { setPromoMsg('❌ Ошибка проверки'); }
  };

  return (
    <div style={{ position:'fixed', inset:0, background:BG, zIndex:200, overflowY:'auto' }}>
      <div style={{ padding:'16px 16px 160px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:22, cursor:'pointer', color:DARK }}>←</button>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:18, color:DARK }}>Корзина ({cart.length})</div>
        </div>
        {cart.length===0 ? (
          <div style={{ textAlign:'center', padding:'60px 0', color:MUTED }}>
            <div style={{ fontSize:50, marginBottom:14 }}>🛒</div>
            <div style={{ fontSize:16, fontWeight:600, color:DARK, marginBottom:8 }}>Корзина пуста</div>
          </div>
        ) : (<>
          {cart.map((item,i)=>(
            <div key={i} style={{ ...S.card, padding:14, marginBottom:10, display:'flex', gap:12 }}>
              <div style={{ width:70, height:70, borderRadius:10, background:BG, overflow:'hidden', flexShrink:0 }}>
                {item.photo ? <img src={item.photo} style={{ width:'100%', height:'100%', objectFit:'cover' }}/> : <div style={{ height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:30 }}>👟</div>}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:14, fontWeight:700, color:DARK }}>{item.name}</div>
                <div style={{ fontSize:12, color:MUTED, marginTop:2 }}>Размер: {item.size} · {item.qty} шт</div>
                <div style={{ fontSize:16, fontWeight:700, color:GOLD, marginTop:4 }}>{fmt(item.total)} сом</div>
              </div>
              <button onClick={()=>onRemove(i)} style={{ background:'none', border:'none', color:RED, fontSize:18, cursor:'pointer' }}>✕</button>
            </div>
          ))}
          {/* Promo code */}
          <div style={{ ...S.card, padding:14, marginTop:4 }}>
            <div style={{ fontSize:12, color:MUTED, marginBottom:8 }}>🎁 Промокод</div>
            <div style={{ display:'flex', gap:8 }}>
              <input style={{ ...S.input, flex:1, padding:'10px 12px', fontSize:14 }} value={promo} onChange={e=>setPromo(e.target.value)} placeholder="Введи промокод"/>
              <button style={{ ...S.btnSm(GOLD), whiteSpace:'nowrap' }} onClick={applyPromo}>Применить</button>
            </div>
            {promoMsg && <div style={{ fontSize:12, color:promoMsg.startsWith('✅')?GREEN:RED, marginTop:6 }}>{promoMsg}</div>}
          </div>
        </>)}
      </div>
      {cart.length>0 && (
        <div style={{ position:'fixed', bottom:0, left:0, right:0, background:WHITE, borderTop:`1px solid ${BORD}`, padding:16, boxShadow:'0 -4px 20px rgba(0,0,0,0.08)' }}>
          {discount>0 && <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
            <div style={{ fontSize:13, color:MUTED }}>Скидка {discount}%</div>
            <div style={{ fontSize:13, color:GREEN }}>− {fmt(subtotal-total)} сом</div>
          </div>}
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:14 }}>
            <div style={{ fontSize:15, color:MUTED }}>Итого</div>
            <div style={{ fontSize:22, fontWeight:700, color:GOLD }}>{fmt(total)} сом</div>
          </div>
          <button style={S.btn()} onClick={customer?()=>onCheckout(discount):onNeedAuth}>
            {customer?'Оформить заказ →':'Войти и оформить →'}
          </button>
        </div>
      )}
    </div>
  );
}

// ── ORDER FORM ────────────────────────────────────────────────
function OrderForm({ cart, customer, discount, onClose, onSuccess }) {
  const [address, setAddress] = useState('');
  const [payment, setPayment] = useState('cash');
  const [note, setNote]       = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr]         = useState('');

  const subtotal = cart.reduce((s,x)=>s+x.total,0);
  const total = Math.round(subtotal*(1-discount/100));

  const submit = async () => {
    setLoading(true); setErr('');
    try {
      await Promise.all(cart.map(item=>addDoc(collection(db,'shop_orders'),{
        customerName:customer.name, customerPhone:customer.phone, customerId:customer.id,
        productId:item.id, productName:item.name, qty:item.qty, price:item.price,
        total:Math.round(item.total*(1-discount/100)), size:item.size,
        address:address.trim(), payment, note:note.trim(),
        status:'new', source:'shop', date:nowStr(), discount
      })));
      onSuccess();
    } catch { setErr('Ошибка. Попробуй снова.'); }
    setLoading(false);
  };

  return (
    <div style={{ position:'fixed', inset:0, background:BG, zIndex:300, overflowY:'auto' }}>
      <div style={{ padding:'16px 16px 100px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:22, cursor:'pointer', color:DARK }}>←</button>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:18, color:DARK }}>Оформление</div>
        </div>
        <div style={{ ...S.card, padding:14, marginBottom:14, display:'flex', gap:12, alignItems:'center' }}>
          <div style={{ width:40, height:40, borderRadius:'50%', background:GOLD+'22', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>👤</div>
          <div><div style={{ fontWeight:700, color:DARK }}>{customer.name}</div><div style={{ fontSize:12, color:MUTED }}>{customer.phone}</div></div>
        </div>
        <div style={{ ...S.card, padding:14, marginBottom:14 }}>
          {cart.map((item,i)=>(
            <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:`1px solid ${BORD}` }}>
              <div style={{ fontSize:13 }}>{item.name} р.{item.size} × {item.qty}</div>
              <div style={{ fontWeight:600, color:GOLD }}>{fmt(Math.round(item.total*(1-discount/100)))}</div>
            </div>
          ))}
          <div style={{ display:'flex', justifyContent:'space-between', marginTop:10 }}>
            <div style={{ fontWeight:700 }}>Итого</div>
            <div style={{ fontSize:18, fontWeight:700, color:GOLD }}>{fmt(total)} сом</div>
          </div>
        </div>
        <div style={{ marginBottom:14 }}><label style={S.label}>Адрес доставки</label><input style={S.input} value={address} onChange={e=>setAddress(e.target.value)} placeholder="ул. Рудаки 10, кв. 5"/></div>
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
        <div style={{ marginBottom:14 }}><label style={S.label}>Заметка</label><input style={S.input} value={note} onChange={e=>setNote(e.target.value)} placeholder="Особые пожелания..."/></div>
        {err&&<div style={{ fontSize:13, color:RED, marginBottom:10, textAlign:'center' }}>{err}</div>}
      </div>
      <div style={{ position:'fixed', bottom:0, left:0, right:0, padding:16, background:WHITE, borderTop:`1px solid ${BORD}` }}>
        <button style={S.btn()} onClick={submit} disabled={loading}>{loading?'Оформляем...':'Подтвердить заказ →'}</button>
      </div>
    </div>
  );
}

// ── SUCCESS ───────────────────────────────────────────────────
function SuccessPage({ onClose }) {
  return (
    <div style={{ position:'fixed', inset:0, background:WHITE, zIndex:400, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:24 }}>
      <div style={{ fontSize:72, marginBottom:20 }}>🎉</div>
      <div style={{ fontFamily:"'Playfair Display',serif", fontSize:26, color:DARK, marginBottom:12, textAlign:'center' }}>Заказ принят!</div>
      <div style={{ fontSize:14, color:MUTED, textAlign:'center', marginBottom:28, lineHeight:1.9 }}>
        Мы свяжемся с вами в течение 30 минут<br/>для подтверждения заказа
      </div>
      <div style={{ ...S.card, padding:16, marginBottom:24, width:'100%', maxWidth:320, textAlign:'center' }}>
        <div style={{ fontSize:13, color:MUTED }}>Следи за статусом в</div>
        <div style={{ fontSize:14, fontWeight:700, color:GOLD, marginTop:4 }}>👤 Мой аккаунт → История заказов</div>
      </div>
      <button style={{ ...S.btn(GOLD), maxWidth:320, width:'100%' }} onClick={onClose}>← Вернуться в каталог</button>
    </div>
  );
}

// ── PRODUCT CARD ──────────────────────────────────────────────
function ProductCard({ product, photo, onAddToCart, isFav, onToggleFav }) {
  const [showSizes, setShowSizes] = useState(false);
  const [size, setSize]           = useState('');
  const [showGuide, setShowGuide] = useState(false);
  const [added, setAdded]         = useState(false);
  const SIZES = ['36','37','38','39','40','41','42'];
  const avail = product.qty - (product.reserved||0);

  const addToCart = () => {
    if (!size) { setShowSizes(true); return; }
    onAddToCart({ ...product, photo, size, qty:1, total:product.price });
    setAdded(true);
    setTimeout(()=>setAdded(false), 1500);
    setShowSizes(false); setSize('');
  };

  return (
    <div style={{ ...S.card }}>
      {showGuide && <SizeGuideModal onClose={()=>setShowGuide(false)}/>}
      <div style={{ height:190, background:BG, position:'relative', overflow:'hidden' }}>
        {photo ? <img src={photo} alt={product.name} style={{ width:'100%', height:'100%', objectFit:'cover' }}/> : <div style={{ height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:52 }}>👟</div>}
        <button onClick={()=>onToggleFav(product.id)}
          style={{ position:'absolute', top:8, left:8, background:'rgba(255,255,255,0.9)', border:'none', borderRadius:'50%', width:32, height:32, cursor:'pointer', fontSize:16, display:'flex', alignItems:'center', justifyContent:'center' }}>
          {isFav ? '❤️' : '🤍'}
        </button>
        {avail <= 5 && avail > 0 && (
          <div style={{ position:'absolute', bottom:8, left:8, background:RED, color:WHITE, borderRadius:6, padding:'3px 8px', fontSize:10, fontWeight:700 }}>
            Осталось {avail} пар!
          </div>
        )}
        {avail > 5 && (
          <div style={{ position:'absolute', top:8, right:8, background:GREEN, color:WHITE, borderRadius:6, padding:'3px 8px', fontSize:10, fontWeight:700 }}>В наличии</div>
        )}
      </div>
      <div style={{ padding:12 }}>
        <div style={{ fontSize:11, color:GOLD, letterSpacing:1, marginBottom:2 }}>{product.id}</div>
        <div style={{ fontSize:14, fontWeight:700, color:DARK, marginBottom:4 }}>{product.name}</div>
        <div style={{ fontSize:19, fontWeight:700, color:GOLD, marginBottom:10 }}>{fmt(product.price)} сом</div>
        {showSizes && (
          <div style={{ marginBottom:10 }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
              <div style={{ fontSize:11, color:MUTED }}>Выбери размер:</div>
              <button style={{ background:'none', border:'none', fontSize:11, color:BLUE, cursor:'pointer' }} onClick={()=>setShowGuide(true)}>📏 Помощь с размером</button>
            </div>
            <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
              {SIZES.map(s=>(
                <div key={s} onClick={()=>setSize(s)}
                  style={{ padding:'6px 10px', borderRadius:6, cursor:'pointer', fontSize:13, fontWeight:600,
                    background:size===s?GOLD:BG, color:size===s?WHITE:DARK, border:`1.5px solid ${size===s?GOLD:BORD}` }}>
                  {s}
                </div>
              ))}
            </div>
          </div>
        )}
        <button style={{ ...S.btnSm(GREEN), width:'100%', textAlign:'center', marginBottom:6 }} onClick={()=>openWhatsApp(product,size)}>
          💬 Заказать в WhatsApp
        </button>
        <button style={{ ...S.btn(added?GREEN:GOLD), padding:'10px 16px', fontSize:13 }} onClick={addToCart}>
          {added ? '✓ Добавлено!' : showSizes && !size ? '👆 Выбери размер' : '🛒 В корзину'}
        </button>
      </div>
      <ReviewsSection productId={product.id}/>
    </div>
  );
}


// ── TRANSLATIONS ─────────────────────────────────────────────
const LANGS = {
  ru: {
    brand:'QUEEN STAR', city:'ДУШАНБЕ · ТАДЖИКИСТАН',
    catalog:'Каталог', cart:'Корзина', account:'Войти', myAccount:'Аккаунт',
    search:'Поиск товаров...', inStock:'В наличии', left:'Осталось',
    pairs:'пар!', addCart:'В корзину', added:'Добавлено!',
    chooseSize:'Выбери размер', sizeHelp:'Помощь с размером',
    delivery:'Доставка по городу', pay:'Нал/Перевод', ret:'Возврат 7 дней',
    reviews:'Отзывов нет', seeReviews:'Смотреть', hideReviews:'Скрыть',
    contact:'Связаться с нами', hours:'Время работы',
    open:'Открыто', closed:'Закрыто', orderWA:'Заказать в WhatsApp',
    favs:'Избранное', sortDefault:'По умолчанию', sortAsc:'Цена ↑', sortDesc:'Цена ↓',
    items:'товаров', login:'Войти / Регистрация', newAccount:'Создать аккаунт',
    phone:'Номер телефона', name:'Твоё имя', continue:'Продолжить →',
    createAcc:'✓ Создать аккаунт', back:'← Назад', orderTitle:'Оформление',
    address:'Адрес доставки', note:'Заметка', cash:'💵 Наличные', transfer:'📲 Перевод',
    confirm:'Подтвердить заказ →', orderAccepted:'Заказ принят!',
    contactIn:'Свяжемся с вами в течение 30 минут',
    trackIn:'Следи за статусом в', myOrders:'История заказов',
    returnCatalog:'← Вернуться в каталог', promoCode:'Промокод',
    apply:'Применить', total:'Итого', checkout:'Оформить заказ →',
    loginCheckout:'Войти и оформить →', orderHistory:'История заказов',
    noOrders:'Заказов пока нет', spent:'сом потрачено', orders:'заказов',
    logout:'Выйти', leaveReview:'⭐ Оставить отзыв', sendReview:'Отправить отзыв',
    thankReview:'Спасибо за отзыв!', close:'Закрыть',
    status_new:'Принят ✓', status_delivery:'В доставке 🚚', status_done:'Получен ✓', status_cancelled:'Отменён',
  },
  tj: {
    brand:'QUEEN STAR', city:'ДУШАНБЕ · ТОҶИКИСТОН',
    catalog:'Феҳрист', cart:'Сабад', account:'Ворид шудан', myAccount:'Аккаунт',
    search:'Ҷустуҷӯи молҳо...', inStock:'Дар анбор', left:'Монд',
    pairs:'ҷуфт!', addCart:'Ба сабад', added:'Илова шуд!',
    chooseSize:'Андоза интихоб кун', sizeHelp:'Кӯмак бо андоза',
    delivery:'Расонидан дар шаҳр', pay:'Нақд/Ҳавола', ret:'Баргардондан 7 рӯз',
    reviews:'Шарҳе нест', seeReviews:'Дидан', hideReviews:'Пинҳон кардан',
    contact:'Бо мо тамос гиред', hours:'Вақти кор',
    open:'Кушода', closed:'Пӯшида', orderWA:'Дар WhatsApp фармоиш кун',
    favs:'Дӯстдоштаҳо', sortDefault:'Пешфарз', sortAsc:'Нарх ↑', sortDesc:'Нарх ↓',
    items:'мол', login:'Ворид шудан / Бақайдгирӣ', newAccount:'Аккаунт созед',
    phone:'Рақами телефон', name:'Номи шумо', continue:'Давом додан →',
    createAcc:'✓ Аккаунт созед', back:'← Бозгашт', orderTitle:'Фармоиш',
    address:'Суроғаи расонидан', note:'Изоҳ', cash:'💵 Нақд', transfer:'📲 Ҳавола',
    confirm:'Тасдиқ кардан →', orderAccepted:'Фармоиш қабул шуд!',
    contactIn:'Дар давоми 30 дақиқа бо шумо тамос мегирем',
    trackIn:'Вазъиятро дар', myOrders:'Таърихи фармоишҳо',
    returnCatalog:'← Бозгашт ба феҳрист', promoCode:'Промокод',
    apply:'Татбиқ', total:'Ҳамагӣ', checkout:'Фармоиш додан →',
    loginCheckout:'Ворид шавед ва фармоиш диҳед →', orderHistory:'Таърихи фармоишҳо',
    noOrders:'Фармоише нест', spent:'сомонӣ харҷ шуд', orders:'фармоиш',
    logout:'Баромадан', leaveReview:'⭐ Шарҳ гузоред', sendReview:'Шарҳ фиристодан',
    thankReview:'Ташаккур барои шарҳ!', close:'Пӯшидан',
    status_new:'Қабул шуд ✓', status_delivery:'Дар роҳ 🚚', status_done:'Гирифта шуд ✓', status_cancelled:'Бекор шуд',
  }
};

// ── STORE HOURS ───────────────────────────────────────────────
function StoreHours({t}){
  const now=new Date();
  const hour=now.getHours();
  const day=now.getDay();
  const isOpen=day>=1&&day<=6&&hour>=9&&hour<21||day===0&&hour>=10&&hour<19;
  const todayHours=day===0?'10:00–19:00':'09:00–21:00';
  return(
    <div style={{display:'flex',alignItems:'center',gap:8,padding:'6px 10px',background:isOpen?GREEN+'15':RED+'15',borderRadius:8,border:`1px solid ${isOpen?GREEN:RED}44`,marginBottom:10}}>
      <div style={{width:8,height:8,borderRadius:'50%',background:isOpen?GREEN:RED,flexShrink:0}}/>
      <div style={{fontSize:12,fontWeight:600,color:isOpen?GREEN:RED}}>{isOpen?t.open:t.closed}</div>
      <div style={{fontSize:11,color:MUTED}}>· {todayHours}</div>
    </div>
  );
}


const openWhatsApp=(product,size)=>{
  const msg=`Саломе! Мен "${product.name}" фармоиш додан мехоҳам%0AАндоза: ${size||'?'}%0AНарх: ${fmt(product.price)} сом`;
  window.open('https://wa.me/992876982424?text='+msg,'_blank');
};

// ── MAIN APP ─────────────────────────────────────────────────
export default function ShopApp() {
  const [lang, setLang] = useState('ru');
  const t = LANGS[lang];
  const [products, setProducts] = useState([]);
  const [photos, setPhotos]     = useState({});
  const [loading, setLoading]   = useState(true);
  const [cart, setCart]         = useState([]);
  const [favs, setFavs]         = useState([]);
  const [customer, setCustomer] = useState(null);
  const [screen, setScreen]     = useState('catalog');
  const [showAuth, setShowAuth] = useState(false);
  const [showOrder, setShowOrder] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [discount, setDiscount] = useState(0);
  const [search, setSearch]     = useState('');
  const [filterCat, setFilterCat] = useState('all');
  const [sortBy, setSortBy]     = useState('default');
  const [toasts, setToasts]     = useState([]);
  const [showFavOnly, setShowFavOnly] = useState(false);

  const addToast = (msg, color=GREEN) => {
    const id = Date.now();
    setToasts(p=>[...p,{id,msg,color}]);
    setTimeout(()=>setToasts(p=>p.filter(t=>t.id!==id)),3000);
  };

  useEffect(()=>{
    try {
      const l = localStorage.getItem('qs_lang'); if(l) setLang(l);
      const c = localStorage.getItem('qs_customer');
      const f = localStorage.getItem('qs_favs');
      if(c) setCustomer(JSON.parse(c));
      if(f) setFavs(JSON.parse(f));
    } catch {}
  },[]);

  useEffect(()=>{
    const load = async () => {
      try {
        const [ps,ph] = await Promise.all([getDoc(doc(db,'qs','products')),getDoc(doc(db,'qs','photos'))]);
        if(ps.exists()) setProducts(JSON.parse(ps.data().v).filter(p=>!p.transit&&(p.qty-(p.reserved||0))>0));
        if(ph.exists()) setPhotos(JSON.parse(ph.data().v));
      } catch {}
      setLoading(false);
    };
    load();
    const unsub = onSnapshot(doc(db,'qs','products'),snap=>{
      if(snap.exists()) try{ setProducts(JSON.parse(snap.data().v).filter(p=>!p.transit&&(p.qty-(p.reserved||0))>0)); }catch{}
    });
    return()=>unsub();
  },[]);

  const login = (c) => { setCustomer(c); try{ localStorage.setItem('qs_customer',JSON.stringify(c)); }catch{} };
  const logout = () => { setCustomer(null); try{ localStorage.removeItem('qs_customer'); }catch{}; setScreen('catalog'); };

  const toggleFav = (id) => {
    const next = favs.includes(id) ? favs.filter(f=>f!==id) : [...favs, id];
    setFavs(next);
    try { localStorage.setItem('qs_favs', JSON.stringify(next)); } catch {}
    if(!favs.includes(id)) addToast('❤️ Добавлено в избранное', GOLD);
  };

  const addToCart = (item) => { setCart(p=>[...p,item]); addToast('🛒 Добавлено в корзину', GOLD); };
  const removeFromCart = (i) => setCart(p=>p.filter((_,idx)=>idx!==i));
  const checkout = (d) => { setDiscount(d); setScreen('catalog'); setShowOrder(true); };
  const onOrderSuccess = () => { setCart([]); setShowOrder(false); setShowSuccess(true); };

  // Filter & sort
  const cats = ['all', ...new Set(products.map(p=>p.id.split('-')[0]))];
  let filtered = products.filter(p=>{
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCat==='all' || p.id.startsWith(filterCat);
    const matchFav = !showFavOnly || favs.includes(p.id);
    return matchSearch && matchCat && matchFav;
  });
  if(sortBy==='price_asc') filtered = [...filtered].sort((a,b)=>a.price-b.price);
  if(sortBy==='price_desc') filtered = [...filtered].sort((a,b)=>b.price-a.price);

  if(loading) return(
    <div style={{ background:BG, minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:12 }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=DM+Sans:opsz,wght@9..40,400;9..40,600;9..40,700&display=swap');*{box-sizing:border-box;margin:0;padding:0;}`}</style>
      <div style={{ fontFamily:"'Playfair Display',serif", fontSize:24, color:GOLD, letterSpacing:4 }}>QUEEN STAR</div>
      <div style={{ fontSize:12, color:MUTED }}>Загрузка каталога...</div>
    </div>
  );

  return(
    <div style={{ background:BG, minHeight:'100vh', color:DARK, fontFamily:"'DM Sans',sans-serif", paddingBottom:20 }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,600;9..40,700&display=swap');*{box-sizing:border-box;margin:0;padding:0;}input::placeholder{color:#C0B0A0;}button:disabled{opacity:0.6;}`}</style>
      <Toast toasts={toasts}/>
      <Header cartCount={cart.length} favCount={favs.length} onCart={()=>setScreen('cart')} onAccount={()=>customer?setScreen('account'):setShowAuth(true)} onFav={()=>setShowFavOnly(!showFavOnly)} customer={customer} lang={lang} setLang={setLang}/>

      {showAuth && <AuthModal onClose={()=>setShowAuth(false)} onLogin={login}/>}
      {showSuccess && <SuccessPage onClose={()=>setShowSuccess(false)}/>}
      {showOrder && customer && <OrderForm cart={cart} customer={customer} discount={discount} onClose={()=>setShowOrder(false)} onSuccess={onOrderSuccess}/>}
      {screen==='cart' && <CartPage cart={cart} onClose={()=>setScreen('catalog')} onCheckout={checkout} onRemove={removeFromCart} customer={customer} onNeedAuth={()=>{setScreen('catalog');setShowAuth(true);}}/>}
      {screen==='account' && customer && <AccountPage customer={customer} onClose={()=>setScreen('catalog')} onLogout={logout}/>}

      {screen==='catalog' && (
        <div style={{ padding:'14px 14px' }}>
          {/* Banner */}
          <div style={{ background:`linear-gradient(135deg,${GOLD},${GOLDD})`, borderRadius:16, padding:18, marginBottom:16, color:WHITE, textAlign:'center' }}>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:22, letterSpacing:2, marginBottom:4 }}>QUEEN STAR</div>
            <div style={{ fontSize:12, opacity:0.9, marginBottom:12 }}>Женская обувь · Душанбе · Доставка по городу</div>
            <div style={{ display:'flex', justifyContent:'center', gap:14, flexWrap:'wrap' }}>
              {['🚚 Доставка','💳 Нал/Перевод','📦 Возврат 7 дней','📏 Таблица размеров'].map(t=>(
                <div key={t} style={{ fontSize:11, opacity:0.9 }}>{t}</div>
              ))}
            </div>
          </div>

          {/* Search */}
          <div style={{ position:'relative', marginBottom:10 }}>
            <input style={{ ...S.input, paddingLeft:40 }} value={search} onChange={e=>setSearch(e.target.value)} placeholder="Поиск товаров..."/>
            <span style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', fontSize:16, color:MUTED }}>🔍</span>
          </div>

          {/* Filters */}
          <div style={{ display:'flex', gap:6, overflowX:'auto', marginBottom:10, paddingBottom:4 }}>
            <button onClick={()=>setShowFavOnly(!showFavOnly)}
              style={{ ...S.btnSm(showFavOnly?RED:MUTED), whiteSpace:'nowrap', fontSize:12, padding:'6px 10px', flexShrink:0 }}>
              ❤️ Избранное {favs.length>0?`(${favs.length})`:''}
            </button>
            <select value={sortBy} onChange={e=>setSortBy(e.target.value)}
              style={{ border:`1.5px solid ${BORD}`, borderRadius:8, padding:'6px 10px', fontSize:12, color:DARK, background:WHITE, cursor:'pointer' }}>
              <option value="default">По умолчанию</option>
              <option value="price_asc">Цена ↑</option>
              <option value="price_desc">Цена ↓</option>
            </select>
          </div>

          <div style={{ fontSize:12, color:MUTED, marginBottom:12 }}>{filtered.length} товаров</div>

          {filtered.length===0 ? (
            <div style={{ textAlign:'center', padding:'40px 0', color:MUTED }}>
              <div style={{ fontSize:40, marginBottom:12 }}>😔</div>
              {showFavOnly ? 'Нет избранных товаров' : 'Ничего не найдено'}
            </div>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              {filtered.map(p=>(
                <ProductCard key={p.id} product={p} photo={photos[p.id]}
                  onAddToCart={addToCart} isFav={favs.includes(p.id)} onToggleFav={toggleFav}/>
              ))}
            </div>
          )}

          {/* Contact */}
          <div style={{ ...S.card, padding:16, marginTop:20, textAlign:'center' }}>
            <StoreHours t={t}/>
            <div style={{ fontSize:14, fontWeight:700, color:DARK, marginBottom:10 }}>Связаться с нами</div>
            <div style={{ display:'flex', gap:10, justifyContent:'center' }}>
              <a href="https://t.me/queenstar_shop" target="_blank" style={{ ...S.btnSm(BLUE), textDecoration:'none', display:'inline-block' }}>📱 Telegram</a>
              <a href="https://wa.me/992876982424" target="_blank" style={{ ...S.btnSm(GREEN), textDecoration:'none', display:'inline-block' }}>💬 WhatsApp</a>
              <a href="https://instagram.com/queenstar.shop" target="_blank" style={{ ...S.btnSm(GOLD), textDecoration:'none', display:'inline-block' }}>📸 Instagram</a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
