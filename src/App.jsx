import { useState, useEffect, useRef } from "react";
import { db } from './firebase.js';
import { doc, getDoc, getDocs, addDoc, collection, onSnapshot, query, where, setDoc, orderBy } from 'firebase/firestore';

// ── THEME ─────────────────────────────────────────────────────
const BG     = '#FAF7F2';
const PAPER  = '#FFFFFF';
const INK    = '#231A14';
const GOLD   = '#C28A2E';
const GOLD_D = '#9C6F22';
const GOLD_L = '#E8C887';
const SAND   = '#F1E8D8';
const LINE   = '#E9E0D2';
const MUTED  = '#8C7B68';
const GREEN  = '#3D8B5F';
const RED    = '#C24E4E';
const BLUE   = '#3E76A8';

const fmt = (n) => new Intl.NumberFormat('ru-RU').format(Math.round(n||0));
const nowStr = () => new Date().toISOString();

const FONTS = "@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,700;1,500&family=Manrope:wght@400;500;600;700;800&display=swap');";

const S = {
  page:  { maxWidth:480, margin:'0 auto', background:BG, minHeight:'100vh' },
  btn:   (c=GOLD)=>({ background:c, border:'none', borderRadius:14, padding:'15px 20px', color:'#fff', fontWeight:700, fontSize:15, cursor:'pointer', width:'100%', fontFamily:'inherit', letterSpacing:0.2 }),
  btnGhost:(c=GOLD)=>({ background:'transparent', border:`1.5px solid ${c}`, borderRadius:12, padding:'10px 16px', color:c, fontWeight:600, fontSize:13, cursor:'pointer', fontFamily:'inherit' }),
  input: { background:PAPER, border:`1.5px solid ${LINE}`, borderRadius:12, padding:'13px 14px', color:INK, fontSize:15, width:'100%', outline:'none', boxSizing:'border-box', fontFamily:'inherit' },
  label: { fontSize:11, color:MUTED, letterSpacing:1.4, marginBottom:7, textTransform:'uppercase', display:'block', fontWeight:700 },
  card:  { background:PAPER, borderRadius:18, border:`1px solid ${LINE}`, overflow:'hidden', boxShadow:'0 1px 3px rgba(35,26,20,0.04), 0 8px 24px rgba(35,26,20,0.04)' },
  chip:  (active)=>({ padding:'7px 14px', borderRadius:999, fontSize:12, fontWeight:700, cursor:'pointer', whiteSpace:'nowrap', border:`1.5px solid ${active?GOLD:LINE}`, background:active?GOLD:PAPER, color:active?'#fff':MUTED, flexShrink:0 }),
};

// ── DATA ──────────────────────────────────────────────────────
const SIZE_GUIDE = [
  {size:'36', cm:'22.5'}, {size:'37', cm:'23.5'}, {size:'38', cm:'24.5'},
  {size:'39', cm:'25.0'}, {size:'40', cm:'26.0'}, {size:'41', cm:'26.5'}, {size:'42', cm:'27.5'},
];

const FAQ = [
  {q:'Как оформить заказ?', a:'Выбери товар, размер, нажми "В корзину". В корзине оформи заказ — укажи адрес и способ оплаты. Мы свяжемся для подтверждения.'},
  {q:'Какие способы оплаты?', a:'Наличными курьеру при получении или переводом на карту.'},
  {q:'Сколько идёт доставка?', a:'По Душанбе доставка обычно занимает 1–2 дня после подтверждения заказа.'},
  {q:'Можно вернуть товар?', a:'Да, в течение 7 дней с момента получения, если товар не был в носке и сохранён вид.'},
  {q:'Как узнать свой размер?', a:'Используй кнопку "Помощь с размером" на карточке товара — там таблица соответствия.'},
  {q:'Есть самовывоз?', a:'Да, можно выбрать самовывоз при оформлении заказа и забрать товар в магазине.'},
];

const WHATSAPP_NUMBER = '992000000000'; // ⚠️ замени на свой номер

// ── TOAST ─────────────────────────────────────────────────────
function Toast({ toasts }) {
  if (!toasts.length) return null;
  return (
    <div style={{ position:'fixed', top:74, left:0, right:0, zIndex:999, padding:'0 14px', pointerEvents:'none' }}>
      <div style={{ maxWidth:480, margin:'0 auto' }}>
        {toasts.map(t=>(
          <div key={t.id} style={{ background:INK, color:'#fff', borderRadius:12, padding:'12px 16px', marginBottom:8, fontSize:13, fontWeight:600, boxShadow:'0 8px 24px rgba(0,0,0,0.18)', display:'flex', alignItems:'center', gap:8 }}>
            {t.msg}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── BADGE / RATING HELPERS ───────────────────────────────────
function Stars({ value, size=12 }) {
  return (
    <span style={{ color:GOLD, fontSize:size, letterSpacing:1 }}>
      {'★'.repeat(Math.round(value))}{'☆'.repeat(5-Math.round(value))}
    </span>
  );
}

// ── SIZE GUIDE MODAL ──────────────────────────────────────────
function SizeGuideModal({ onClose }) {
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(35,26,20,0.4)', zIndex:400, display:'flex', alignItems:'flex-end', justifyContent:'center' }}>
      <div style={{ background:PAPER, borderRadius:'24px 24px 0 0', padding:24, width:'100%', maxWidth:480 }}>
        <div style={{ width:36, height:4, background:LINE, borderRadius:2, margin:'0 auto 18px' }}/>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:18 }}>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:19, color:INK, fontWeight:700 }}>Таблица размеров</div>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer', color:MUTED }}>✕</button>
        </div>
        <div style={{ fontSize:13, color:MUTED, marginBottom:14 }}>Измерь длину стопы и выбери подходящий размер:</div>
        <div style={{ borderRadius:14, overflow:'hidden', border:`1px solid ${LINE}` }}>
          <div style={{ display:'flex', background:SAND, padding:'11px 16px', fontWeight:700, fontSize:12, color:GOLD_D, letterSpacing:0.5 }}>
            <div style={{ flex:1 }}>РАЗМЕР EU</div>
            <div style={{ flex:1 }}>ДЛИНА СТОПЫ</div>
          </div>
          {SIZE_GUIDE.map((r,i)=>(
            <div key={r.size} style={{ display:'flex', padding:'11px 16px', background:i%2===0?PAPER:BG, fontSize:14 }}>
              <div style={{ flex:1, fontWeight:700, color:INK }}>{r.size}</div>
              <div style={{ flex:1, color:MUTED }}>{r.cm} см</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize:12, color:MUTED, marginTop:12, textAlign:'center' }}>Если между размерами — выбирай больший</div>
        <button style={{ ...S.btn(GOLD), marginTop:16 }} onClick={onClose}>Понятно</button>
      </div>
    </div>
  );
}

// ── STORE HOURS ───────────────────────────────────────────────
function StoreHours() {
  const now = new Date();
  const hour = now.getHours();
  const day = now.getDay();
  const isOpen = (day>=1 && day<=6 && hour>=9 && hour<21) || (day===0 && hour>=10 && hour<19);
  const todayHours = day===0 ? '10:00–19:00' : '09:00–21:00';
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8, padding:'9px 14px', background:isOpen?GREEN+'14':RED+'14', borderRadius:12, border:`1px solid ${isOpen?GREEN:RED}33` }}>
      <div style={{ width:7, height:7, borderRadius:'50%', background:isOpen?GREEN:RED, flexShrink:0 }}/>
      <div style={{ fontSize:12, fontWeight:700, color:isOpen?GREEN:RED }}>{isOpen?'Открыто сейчас':'Сейчас закрыто'}</div>
      <div style={{ fontSize:11, color:MUTED }}>· сегодня {todayHours}</div>
    </div>
  );
}

// ── FLASH SALE TIMER ─────────────────────────────────────────
function FlashSaleBanner() {
  const [sale, setSale]   = useState(null);
  const [left, setLeft]   = useState('');

  useEffect(()=>{
    getDoc(doc(db,'qs','flash_sale')).then(snap=>{
      if(snap.exists() && snap.data()?.v){
        try{
          const v = JSON.parse(snap.data().v);
          if(v.active && v.endsAt && new Date(v.endsAt) > new Date()) setSale(v);
        }catch{}
      }
    }).catch(()=>{});
  },[]);

  useEffect(()=>{
    if(!sale) return;
    const tick = () => {
      const diff = new Date(sale.endsAt) - new Date();
      if(diff<=0){ setSale(null); return; }
      const h = Math.floor(diff/3600000);
      const m = Math.floor((diff%3600000)/60000);
      const s = Math.floor((diff%60000)/1000);
      setLeft(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return ()=>clearInterval(id);
  },[sale]);

  if(!sale) return null;

  return (
    <div style={{ background:`linear-gradient(90deg,${RED},#A83838)`, borderRadius:14, padding:'13px 16px', marginBottom:14, color:'#fff', display:'flex', alignItems:'center', justifyContent:'space-between', gap:10 }}>
      <div>
        <div style={{ fontSize:13, fontWeight:800 }}>⚡ {sale.message||'Акция действует ограниченное время'}</div>
        <div style={{ fontSize:11, opacity:0.9, marginTop:2 }}>Успей до конца акции</div>
      </div>
      <div style={{ fontSize:18, fontWeight:800, fontVariantNumeric:'tabular-nums', background:'rgba(255,255,255,0.18)', borderRadius:8, padding:'6px 10px' }}>{left}</div>
    </div>
  );
}

// ── FAQ ───────────────────────────────────────────────────────
function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom:`1px solid ${LINE}`, padding:'14px 0' }}>
      <div onClick={()=>setOpen(!open)} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', cursor:'pointer' }}>
        <div style={{ fontSize:14, fontWeight:700, color:INK, paddingRight:12 }}>{q}</div>
        <div style={{ fontSize:16, color:GOLD, flexShrink:0, transform:open?'rotate(45deg)':'none', transition:'transform 0.2s' }}>＋</div>
      </div>
      {open && <div style={{ fontSize:13, color:MUTED, marginTop:10, lineHeight:1.7 }}>{a}</div>}
    </div>
  );
}

function FaqSection() {
  return (
    <div style={{ ...S.card, padding:'6px 18px 6px' }}>
      <div style={{ fontFamily:"'Playfair Display',serif", fontSize:17, fontWeight:700, color:INK, padding:'14px 0 4px' }}>Частые вопросы</div>
      {FAQ.map((f,i)=><FaqItem key={i} q={f.q} a={f.a}/>)}
    </div>
  );
}

// ── HEADER ────────────────────────────────────────────────────
function Header({ cartCount, favCount, onCart, onAccount, onFav, onFaq, customer }) {
  return (
    <div style={{ background:PAPER, borderBottom:`1px solid ${LINE}`, padding:'14px 16px', display:'flex', justifyContent:'space-between', alignItems:'center', position:'sticky', top:0, zIndex:50 }}>
      <div>
        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:20, color:INK, letterSpacing:1, fontWeight:700 }}>Queen <span style={{color:GOLD}}>Star</span></div>
        <div style={{ fontSize:9, color:MUTED, letterSpacing:2.5, marginTop:1, fontWeight:600 }}>ДУШАНБЕ · ТАДЖИКИСТАН</div>
      </div>
      <div style={{ display:'flex', gap:6, alignItems:'center' }}>
        <button onClick={onFaq} style={{ background:'none', border:'none', fontSize:18, cursor:'pointer', color:MUTED, padding:6 }}>❓</button>
        <button onClick={onFav} style={{ background:'none', border:'none', fontSize:18, cursor:'pointer', padding:6, position:'relative' }}>
          ❤️ {favCount>0 && <span style={{ position:'absolute', top:2, right:0, background:RED, color:'#fff', borderRadius:'50%', fontSize:9, fontWeight:700, width:15, height:15, display:'flex', alignItems:'center', justifyContent:'center' }}>{favCount}</span>}
        </button>
        <button onClick={onAccount} style={{ background:SAND, border:'none', borderRadius:10, padding:'8px 11px', cursor:'pointer', fontSize:13, fontWeight:700, color:GOLD_D }}>
          {customer ? customer.name.split(' ')[0] : '👤'}
        </button>
        <button onClick={onCart} style={{ background:INK, border:'none', borderRadius:10, padding:'9px 13px', color:'#fff', cursor:'pointer', position:'relative', fontSize:15 }}>
          🛍
          {cartCount>0 && <span style={{ position:'absolute', top:-7, right:-7, background:GOLD, color:'#fff', borderRadius:'50%', fontSize:10, fontWeight:700, width:19, height:19, display:'flex', alignItems:'center', justifyContent:'center', border:`2px solid ${BG}` }}>{cartCount}</span>}
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
    <div style={{ position:'fixed', inset:0, background:'rgba(35,26,20,0.4)', zIndex:300, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ background:PAPER, borderRadius:22, padding:26, maxWidth:340, width:'100%' }}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:18 }}>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:18, color:INK, fontWeight:700 }}>{step==='phone'?'Вход в аккаунт':'Создать аккаунт'}</div>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer', color:MUTED }}>✕</button>
        </div>
        {step==='phone'&&(<>
          <div style={{ fontSize:13, color:MUTED, marginBottom:16 }}>Введи номер — войдём или создадим аккаунт</div>
          <label style={S.label}>Номер телефона</label>
          <input style={{ ...S.input, marginBottom:14, fontSize:17 }} value={phone} onChange={e=>{setPhone(e.target.value);setErr('');}} placeholder="+992 900 000000" type="tel"/>
          {err&&<div style={{ fontSize:12, color:RED, marginBottom:10 }}>{err}</div>}
          <button style={S.btn()} onClick={check} disabled={loading}>{loading?'Проверяем...':'Продолжить →'}</button>
        </>)}
        {step==='name'&&(<>
          <div style={{ background:SAND, borderRadius:10, padding:11, marginBottom:14, fontSize:13, color:GOLD_D, fontWeight:600 }}>📱 {phone}</div>
          <label style={S.label}>Твоё имя</label>
          <input style={{ ...S.input, marginBottom:14 }} value={name} onChange={e=>{setName(e.target.value);setErr('');}} placeholder="Зарина, Малика..." autoFocus/>
          {err&&<div style={{ fontSize:12, color:RED, marginBottom:10 }}>{err}</div>}
          <button style={S.btn()} onClick={register} disabled={loading}>{loading?'Создаём...':'✓ Создать аккаунт'}</button>
          <button style={{ ...S.btn(MUTED), marginTop:8, opacity:0.8 }} onClick={()=>setStep('phone')}>← Назад</button>
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
    <div style={{ padding:'12px 16px', borderTop:`1px solid ${LINE}` }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          {avg ? <><Stars value={Number(avg)}/><span style={{ fontSize:12, fontWeight:700, color:INK }}>{avg}</span><span style={{ fontSize:11, color:MUTED }}>({reviews.length})</span></> : <span style={{ fontSize:12, color:MUTED }}>Отзывов пока нет</span>}
        </div>
        {reviews.length>0 && <button style={{ background:'none', border:'none', fontSize:11, color:GOLD_D, cursor:'pointer', fontWeight:700 }} onClick={()=>setShow(!show)}>{show?'Скрыть':'Смотреть'}</button>}
      </div>
      {show && reviews.slice(0,3).map(r=>(
        <div key={r.id} style={{ background:BG, borderRadius:10, padding:11, marginTop:8 }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
            <div style={{ fontSize:12, fontWeight:700, color:INK }}>{r.customerName}</div>
            <Stars value={r.rating} size={11}/>
          </div>
          {r.text && <div style={{ fontSize:12, color:MUTED, lineHeight:1.5 }}>{r.text}</div>}
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
    <div style={{ position:'fixed', inset:0, background:'rgba(35,26,20,0.4)', zIndex:400, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ background:PAPER, borderRadius:22, padding:26, maxWidth:340, width:'100%', textAlign:'center' }}>
        <div style={{ fontSize:46, marginBottom:12 }}>🎉</div>
        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:18, color:INK, fontWeight:700, marginBottom:8 }}>Спасибо за отзыв!</div>
        <button style={{ ...S.btn(GOLD), marginTop:14 }} onClick={onClose}>Закрыть</button>
      </div>
    </div>
  );

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(35,26,20,0.4)', zIndex:400, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ background:PAPER, borderRadius:22, padding:26, maxWidth:340, width:'100%' }}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:16 }}>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:17, color:INK, fontWeight:700 }}>Оставить отзыв</div>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer', color:MUTED }}>✕</button>
        </div>
        <div style={{ fontSize:14, color:MUTED, marginBottom:14 }}>{order.productName}</div>
        <div style={{ display:'flex', gap:8, marginBottom:16 }}>
          {[1,2,3,4,5].map(s=>(
            <div key={s} onClick={()=>setRating(s)} style={{ fontSize:30, cursor:'pointer', opacity:s<=rating?1:0.25, color:GOLD }}>★</div>
          ))}
        </div>
        <textarea value={text} onChange={e=>setText(e.target.value)} placeholder="Расскажи о товаре..."
          style={{ ...S.input, minHeight:84, resize:'vertical', marginBottom:14 }}/>
        <button style={S.btn()} onClick={submit}>Отправить отзыв</button>
      </div>
    </div>
  );
}

// ── ACCOUNT PAGE ──────────────────────────────────────────────
function AccountPage({ customer, onClose, onLogout, addToast }) {
  const [orders, setOrders]       = useState([]);
  const [reviewFor, setReviewFor] = useState(null);
  const prevStatuses = useRef({});

  useEffect(()=>{
    if(!customer) return;
    const q = query(collection(db,'shop_orders'), where('customerPhone','==',customer.phone));
    const unsub = onSnapshot(q, snap=>{
      const list = snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>new Date(b.date)-new Date(a.date));
      list.forEach(o=>{
        if(prevStatuses.current[o.id] && prevStatuses.current[o.id]!==o.status){
          if(o.status==='delivery') addToast('🚚 Ваш заказ выехал!');
          if(o.status==='done')     addToast('✅ Заказ доставлен! Оцените товар');
        }
        prevStatuses.current[o.id] = o.status;
      });
      setOrders(list);
    });
    return()=>unsub();
  },[customer]);

  const ST = {
    new:{l:'Принят',c:GOLD}, delivery:{l:'В доставке',c:BLUE},
    done:{l:'Получен',c:GREEN}, cancelled:{l:'Отменён',c:RED}
  };

  return (
    <div style={{ position:'fixed', inset:0, background:BG, zIndex:200, overflowY:'auto' }}>
      {reviewFor && <LeaveReview order={reviewFor} customer={customer} onClose={()=>setReviewFor(null)}/>}
      <div style={{ ...S.page, padding:'16px 16px 80px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:22, cursor:'pointer', color:INK }}>←</button>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:18, color:INK, fontWeight:700 }}>Мой аккаунт</div>
          <button onClick={onLogout} style={{ background:'none', border:'none', fontSize:11, color:RED, cursor:'pointer', fontWeight:700 }}>Выйти</button>
        </div>
        <div style={{ ...S.card, padding:18, marginBottom:22 }}>
          <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:16 }}>
            <div style={{ width:48, height:48, borderRadius:'50%', background:`linear-gradient(135deg,${GOLD},${GOLD_D})`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:19, color:'#fff', fontWeight:700 }}>{customer.name[0].toUpperCase()}</div>
            <div>
              <div style={{ fontSize:18, fontWeight:700, color:INK }}>{customer.name}</div>
              <div style={{ fontSize:13, color:MUTED }}>{customer.phone}</div>
            </div>
          </div>
          <div style={{ display:'flex', gap:10 }}>
            <div style={{ flex:1, background:BG, borderRadius:12, padding:'12px', textAlign:'center' }}>
              <div style={{ fontSize:22, fontWeight:800, color:GOLD_D }}>{orders.length}</div>
              <div style={{ fontSize:10, color:MUTED, fontWeight:600 }}>заказов</div>
            </div>
            <div style={{ flex:1, background:BG, borderRadius:12, padding:'12px', textAlign:'center' }}>
              <div style={{ fontSize:22, fontWeight:800, color:GREEN }}>{fmt(orders.filter(o=>o.status==='done').reduce((s,o)=>s+o.total,0))}</div>
              <div style={{ fontSize:10, color:MUTED, fontWeight:600 }}>сом потрачено</div>
            </div>
          </div>
        </div>
        <ReferralBlock customer={customer}/>
        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:16, color:INK, fontWeight:700, marginBottom:12 }}>История заказов</div>
        {orders.length===0 ? (
          <div style={{ textAlign:'center', padding:'40px 0', color:MUTED }}>
            <div style={{ fontSize:38, marginBottom:10 }}>📦</div>
            Заказов пока нет
          </div>
        ) : orders.map(o=>{
          const st = ST[o.status]||ST.new;
          return (
            <div key={o.id} style={{ ...S.card, padding:15, marginBottom:11 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                <div style={{ fontSize:14, fontWeight:700, color:INK }}>{o.productName}</div>
                <div style={{ fontSize:16, fontWeight:800, color:GOLD_D }}>{fmt(o.total)} сом</div>
              </div>
              <div style={{ fontSize:12, color:MUTED, marginBottom:9 }}>р.{o.size} · {o.qty} шт · {new Date(o.date).toLocaleDateString('ru-RU')}</div>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <div style={{ background:st.c+'14', border:`1px solid ${st.c}33`, borderRadius:8, padding:'5px 11px', fontSize:12, fontWeight:700, color:st.c }}>{st.l}</div>
                {o.status==='done' && (
                  <button style={{ ...S.btnGhost(GOLD), padding:'5px 11px', fontSize:11 }} onClick={()=>setReviewFor(o)}>⭐ Отзыв</button>
                )}
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
  const [firstOrderBonus, setFirstOrderBonus] = useState(false);
  const [checkedBonus, setCheckedBonus] = useState(false);
  const [promo, setPromo]       = useState('');
  const [discount, setDiscount] = useState(0);
  const [promoMsg, setPromoMsg] = useState('');

  const subtotal = cart.reduce((s,x)=>s+x.total,0);
  const effectiveDiscount = discount>0 ? discount : (firstOrderBonus ? 10 : 0);
  const total = Math.round(subtotal * (1 - effectiveDiscount/100));

  useEffect(()=>{
    if(!customer){ setCheckedBonus(true); return; }
    const q = query(collection(db,'shop_orders'), where('customerPhone','==',customer.phone));
    getDocs(q).then(snap=>{
      setFirstOrderBonus(snap.empty);
      setCheckedBonus(true);
    }).catch(()=>setCheckedBonus(true));
  },[customer]);

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
      <div style={{ ...S.page, padding:'16px 16px 170px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:22, cursor:'pointer', color:INK }}>←</button>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:18, color:INK, fontWeight:700 }}>Корзина ({cart.length})</div>
        </div>
        {checkedBonus && firstOrderBonus && discount===0 && cart.length>0 && (
          <div style={{ background:`linear-gradient(90deg,${GOLD},${GOLD_D})`, borderRadius:14, padding:'13px 16px', marginBottom:14, color:'#fff', display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ fontSize:22 }}>🎁</div>
            <div>
              <div style={{ fontSize:13, fontWeight:800 }}>Скидка 10% на первый заказ!</div>
              <div style={{ fontSize:11, opacity:0.9 }}>Применится автоматически при оформлении</div>
            </div>
          </div>
        )}
        {cart.length===0 ? (
          <div style={{ textAlign:'center', padding:'70px 0', color:MUTED }}>
            <div style={{ fontSize:46, marginBottom:14 }}>🛍</div>
            <div style={{ fontSize:16, fontWeight:700, color:INK, marginBottom:6 }}>Корзина пуста</div>
            <div style={{ fontSize:13 }}>Добавь товары из каталога</div>
          </div>
        ) : (<>
          {cart.map((item,i)=>(
            <div key={i} style={{ ...S.card, padding:14, marginBottom:11, display:'flex', gap:13 }}>
              <div style={{ width:68, height:68, borderRadius:12, background:BG, overflow:'hidden', flexShrink:0 }}>
                {item.photo ? <img src={item.photo} style={{ width:'100%', height:'100%', objectFit:'cover' }}/> : <div style={{ height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:26 }}>👞</div>}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:14, fontWeight:700, color:INK }}>{item.name}</div>
                <div style={{ fontSize:12, color:MUTED, marginTop:2 }}>Размер {item.size} · {item.qty} шт</div>
                <div style={{ fontSize:15, fontWeight:800, color:GOLD_D, marginTop:5 }}>{fmt(item.total)} сом</div>
              </div>
              <button onClick={()=>onRemove(i)} style={{ background:'none', border:'none', color:MUTED, fontSize:16, cursor:'pointer', alignSelf:'flex-start' }}>✕</button>
            </div>
          ))}
          <div style={{ ...S.card, padding:15, marginTop:6 }}>
            <div style={{ fontSize:12, color:MUTED, marginBottom:9, fontWeight:700 }}>🎁 Промокод</div>
            <div style={{ display:'flex', gap:8 }}>
              <input style={{ ...S.input, flex:1, padding:'10px 12px', fontSize:14 }} value={promo} onChange={e=>setPromo(e.target.value)} placeholder="Введи промокод"/>
              <button style={{ ...S.btnGhost(GOLD), whiteSpace:'nowrap' }} onClick={applyPromo}>Применить</button>
            </div>
            {promoMsg && <div style={{ fontSize:12, color:promoMsg.startsWith('✅')?GREEN:RED, marginTop:8, fontWeight:600 }}>{promoMsg}</div>}
          </div>
        </>)}
      </div>
      {cart.length>0 && (
        <div style={{ position:'fixed', bottom:0, left:0, right:0, background:PAPER, borderTop:`1px solid ${LINE}`, padding:16, boxShadow:'0 -8px 24px rgba(35,26,20,0.06)', zIndex:10 }}>
          <div style={{ maxWidth:480, margin:'0 auto' }}>
            {effectiveDiscount>0 && <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
              <div style={{ fontSize:13, color:MUTED }}>Скидка {effectiveDiscount}%{discount===0?' (первый заказ)':''}</div>
              <div style={{ fontSize:13, color:GREEN, fontWeight:700 }}>− {fmt(subtotal-total)} сом</div>
            </div>}
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:14 }}>
              <div style={{ fontSize:14, color:MUTED, fontWeight:600 }}>Итого</div>
              <div style={{ fontSize:23, fontWeight:800, color:GOLD_D }}>{fmt(total)} сом</div>
            </div>
            <button style={S.btn()} onClick={customer?()=>onCheckout(effectiveDiscount):onNeedAuth}>
              {customer?'Оформить заказ →':'Войти и оформить →'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── ORDER FORM ────────────────────────────────────────────────
function OrderForm({ cart, customer, discount, onClose, onSuccess }) {
  const [deliveryType, setDeliveryType] = useState('delivery');
  const [address, setAddress] = useState('');
  const [payment, setPayment] = useState('cash');
  const [note, setNote]       = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr]         = useState('');

  const subtotal = cart.reduce((s,x)=>s+x.total,0);
  const total = Math.round(subtotal*(1-discount/100));

  const submit = async () => {
    if(deliveryType==='delivery' && !address.trim()){ setErr('Укажи адрес доставки'); return; }
    setLoading(true); setErr('');
    try {
      await Promise.all(cart.map(item=>addDoc(collection(db,'shop_orders'),{
        customerName:customer.name, customerPhone:customer.phone, customerId:customer.id,
        productId:item.id, productName:item.name, qty:item.qty, price:item.price,
        total:Math.round(item.total*(1-discount/100)), size:item.size,
        deliveryType, address:deliveryType==='delivery'?address.trim():'Самовывоз из магазина',
        payment, note:note.trim(),
        status:'new', source:'shop', date:nowStr(), discount
      })));
      onSuccess();
    } catch { setErr('Ошибка. Попробуй снова.'); }
    setLoading(false);
  };

  return (
    <div style={{ position:'fixed', inset:0, background:BG, zIndex:300, overflowY:'auto' }}>
      <div style={{ ...S.page, padding:'16px 16px 110px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:22, cursor:'pointer', color:INK }}>←</button>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:18, color:INK, fontWeight:700 }}>Оформление</div>
        </div>
        <div style={{ ...S.card, padding:14, marginBottom:14, display:'flex', gap:12, alignItems:'center' }}>
          <div style={{ width:42, height:42, borderRadius:'50%', background:`linear-gradient(135deg,${GOLD},${GOLD_D})`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, color:'#fff', fontWeight:700 }}>{customer.name[0].toUpperCase()}</div>
          <div><div style={{ fontWeight:700, color:INK }}>{customer.name}</div><div style={{ fontSize:12, color:MUTED }}>{customer.phone}</div></div>
        </div>
        <div style={{ ...S.card, padding:14, marginBottom:14 }}>
          {cart.map((item,i)=>(
            <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'7px 0', borderBottom:i<cart.length-1?`1px solid ${LINE}`:'none' }}>
              <div style={{ fontSize:13, color:INK }}>{item.name} р.{item.size} × {item.qty}</div>
              <div style={{ fontWeight:700, color:GOLD_D }}>{fmt(Math.round(item.total*(1-discount/100)))}</div>
            </div>
          ))}
          <div style={{ display:'flex', justifyContent:'space-between', marginTop:11 }}>
            <div style={{ fontWeight:700, color:INK }}>Итого</div>
            <div style={{ fontSize:18, fontWeight:800, color:GOLD_D }}>{fmt(total)} сом</div>
          </div>
        </div>

        <div style={{ marginBottom:14 }}>
          <label style={S.label}>Способ получения</label>
          <div style={{ display:'flex', gap:10 }}>
            {[{v:'delivery',l:'🚚 Доставка'},{v:'pickup',l:'🏬 Самовывоз'}].map(opt=>(
              <div key={opt.v} onClick={()=>setDeliveryType(opt.v)}
                style={{ flex:1, padding:'12px', textAlign:'center', borderRadius:12, cursor:'pointer', fontSize:13, fontWeight:700,
                  background:deliveryType===opt.v?GOLD:PAPER, color:deliveryType===opt.v?'#fff':MUTED,
                  border:`1.5px solid ${deliveryType===opt.v?GOLD:LINE}` }}>
                {opt.l}
              </div>
            ))}
          </div>
        </div>

        {deliveryType==='delivery' && (
          <div style={{ marginBottom:14 }}>
            <label style={S.label}>Адрес доставки</label>
            <input style={S.input} value={address} onChange={e=>setAddress(e.target.value)} placeholder="ул. Рудаки 10, кв. 5"/>
          </div>
        )}
        {deliveryType==='pickup' && (
          <div style={{ background:SAND, borderRadius:12, padding:13, marginBottom:14, fontSize:12, color:GOLD_D, fontWeight:600 }}>
            📍 Забрать можно в магазине Queen Star, Душанбе. Адрес пришлём после подтверждения заказа.
          </div>
        )}

        <div style={{ marginBottom:14 }}>
          <label style={S.label}>Оплата</label>
          <div style={{ display:'flex', gap:10 }}>
            {[{v:'cash',l:'💵 Наличные'},{v:'transfer',l:'📲 Перевод'}].map(opt=>(
              <div key={opt.v} onClick={()=>setPayment(opt.v)}
                style={{ flex:1, padding:'12px', textAlign:'center', borderRadius:12, cursor:'pointer', fontSize:13, fontWeight:700,
                  background:payment===opt.v?GOLD:PAPER, color:payment===opt.v?'#fff':MUTED,
                  border:`1.5px solid ${payment===opt.v?GOLD:LINE}` }}>
                {opt.l}
              </div>
            ))}
          </div>
        </div>
        <div style={{ marginBottom:14 }}>
          <label style={S.label}>Заметка</label>
          <input style={S.input} value={note} onChange={e=>setNote(e.target.value)} placeholder="Особые пожелания..."/>
        </div>
        {err&&<div style={{ fontSize:13, color:RED, marginBottom:10, textAlign:'center', fontWeight:600 }}>{err}</div>}
      </div>
      <div style={{ position:'fixed', bottom:0, left:0, right:0, padding:16, background:PAPER, borderTop:`1px solid ${LINE}`, zIndex:10 }}>
          <button style={S.btn()} onClick={submit} disabled={loading}>{loading?'Оформляем...':'Подтвердить заказ →'}</button>
      </div>
    </div>
  );
}

// ── SUCCESS ───────────────────────────────────────────────────
function SuccessPage({ onClose }) {
  return (
    <div style={{ position:'fixed', inset:0, background:PAPER, zIndex:400, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:24 }}>
      <div style={{ fontSize:64, marginBottom:18 }}>🎉</div>
      <div style={{ fontFamily:"'Playfair Display',serif", fontSize:25, color:INK, fontWeight:700, marginBottom:10, textAlign:'center' }}>Заказ принят!</div>
      <div style={{ fontSize:14, color:MUTED, textAlign:'center', marginBottom:26, lineHeight:1.8 }}>
        Мы свяжемся с вами в течение 30 минут<br/>для подтверждения заказа
      </div>
      <div style={{ ...S.card, padding:16, marginBottom:24, width:'100%', maxWidth:320, textAlign:'center' }}>
        <div style={{ fontSize:13, color:MUTED }}>Следи за статусом в</div>
        <div style={{ fontSize:14, fontWeight:700, color:GOLD_D, marginTop:4 }}>👤 Мой аккаунт → История заказов</div>
      </div>
      <button style={{ ...S.btn(GOLD), maxWidth:320, width:'100%' }} onClick={onClose}>← Вернуться в каталог</button>
    </div>
  );
}

// ── PRODUCT CARD ──────────────────────────────────────────────
function ProductCard({ product, photo, onAddToCart, isFav, onToggleFav, isHit }) {
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
    setTimeout(()=>setAdded(false), 1400);
    setShowSizes(false); setSize('');
  };

  const waOrder = () => {
    if(!size){ setShowSizes(true); return; }
    const msg = encodeURIComponent(`Здравствуйте! Хочу заказать "${product.name}", размер ${size}, цена ${fmt(product.price)} сом`);
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`,'_blank');
  };

  return (
    <div style={{ ...S.card }}>
      {showGuide && <SizeGuideModal onClose={()=>setShowGuide(false)}/>}
      <div style={{ height:188, background:BG, position:'relative', overflow:'hidden' }}>
        {photo ? <img src={photo} alt={product.name} style={{ width:'100%', height:'100%', objectFit:'cover' }}/> : <div style={{ height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:48 }}>👞</div>}
        <button onClick={()=>onToggleFav(product.id)}
          style={{ position:'absolute', top:9, left:9, background:'rgba(255,255,255,0.92)', border:'none', borderRadius:'50%', width:31, height:31, cursor:'pointer', fontSize:15, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 2px 6px rgba(0,0,0,0.1)' }}>
          {isFav ? '❤️' : '🤍'}
        </button>
        {isHit && (
          <div style={{ position:'absolute', top:9, right:9, background:INK, color:'#fff', borderRadius:7, padding:'4px 9px', fontSize:10, fontWeight:800, letterSpacing:0.3 }}>🔥 ХИТ</div>
        )}
        {!isHit && avail<=5 && avail>0 && (
          <div style={{ position:'absolute', bottom:9, left:9, background:RED, color:'#fff', borderRadius:7, padding:'4px 9px', fontSize:10, fontWeight:700 }}>Осталось {avail} пар!</div>
        )}
      </div>
      <div style={{ padding:13 }}>
        <div style={{ fontSize:10, color:GOLD_D, letterSpacing:1, marginBottom:3, fontWeight:700 }}>{product.id}</div>
        <div style={{ fontSize:14, fontWeight:700, color:INK, marginBottom:5, lineHeight:1.3 }}>{product.name}</div>
        <div style={{ fontSize:19, fontWeight:800, color:GOLD_D, marginBottom:11 }}>{fmt(product.price)} сом</div>
        {showSizes && (
          <div style={{ marginBottom:11 }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:7 }}>
              <div style={{ fontSize:11, color:MUTED, fontWeight:600 }}>Размер:</div>
              <button style={{ background:'none', border:'none', fontSize:11, color:BLUE, cursor:'pointer', fontWeight:600 }} onClick={()=>setShowGuide(true)}>📏 Помощь</button>
            </div>
            <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
              {SIZES.map(s=>(
                <div key={s} onClick={()=>setSize(s)}
                  style={{ padding:'6px 10px', borderRadius:8, cursor:'pointer', fontSize:13, fontWeight:700,
                    background:size===s?GOLD:BG, color:size===s?'#fff':INK, border:`1.5px solid ${size===s?GOLD:LINE}` }}>
                  {s}
                </div>
              ))}
            </div>
          </div>
        )}
        <button style={{ ...S.btn(added?GREEN:GOLD), padding:'11px 16px', fontSize:13, marginBottom:7 }} onClick={addToCart}>
          {added ? '✓ Добавлено!' : showSizes && !size ? '👆 Выбери размер' : '🛍 В корзину'}
        </button>
        <button style={{ ...S.btnGhost(GREEN), width:'100%', textAlign:'center', padding:'9px' }} onClick={waOrder}>
          💬 WhatsApp
        </button>
      </div>
      <ReviewsSection productId={product.id}/>
    </div>
  );
}

// ── CITY SELECTOR ─────────────────────────────────────────────
function CitySelector({ city, setCity, onClose }) {
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(35,26,20,0.5)', zIndex:500, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ background:PAPER, borderRadius:22, padding:28, maxWidth:340, width:'100%', textAlign:'center' }}>
        <div style={{ fontSize:28, marginBottom:12 }}>📍</div>
        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:20, fontWeight:700, color:INK, marginBottom:8 }}>Выбери регион</div>
        <div style={{ fontSize:13, color:MUTED, marginBottom:22 }}>Покажем товары доступные в твоём городе</div>
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          <button onClick={()=>{ setCity('dushanbe'); onClose(); }}
            style={{ ...S.btn(city==='dushanbe'?GOLD:INK), display:'flex', alignItems:'center', justifyContent:'center', gap:10, fontSize:16 }}>
            🇹🇯 Душанбе, Таджикистан
          </button>
          <button onClick={()=>{ setCity('russia'); onClose(); }}
            style={{ ...S.btn(city==='russia'?GOLD:'#4A6FA5'), display:'flex', alignItems:'center', justifyContent:'center', gap:10, fontSize:16 }}>
            🇷🇺 Россия
          </button>
        </div>
        <div style={{ fontSize:11, color:MUTED, marginTop:14 }}>Можно изменить в любой момент</div>
      </div>
    </div>
  );
}

// ── REFERRAL SYSTEM ───────────────────────────────────────────
function ReferralBlock({ customer }) {
  const [copied, setCopied] = useState(false);
  const refLink = `${window.location.origin}?ref=${customer.id}`;

  const copy = () => {
    navigator.clipboard.writeText(refLink).catch(()=>{});
    setCopied(true);
    setTimeout(()=>setCopied(false), 2000);
  };

  const share = () => {
    const text = `Привет! Заходи в Queen Star — отличная женская обувь в Душанбе и России. По моей ссылке получишь скидку 10% на первый заказ! 👠\n${refLink}`;
    if (navigator.share) navigator.share({ text }).catch(()=>{});
    else copy();
  };

  return (
    <div style={{ ...S.card, padding:16, marginBottom:14, borderColor:GOLD+'44' }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
        <div style={{ fontSize:24 }}>🎁</div>
        <div>
          <div style={{ fontSize:14, fontWeight:700, color:INK }}>Пригласи друга</div>
          <div style={{ fontSize:12, color:MUTED }}>Ты и друг получите скидку 10%</div>
        </div>
      </div>
      <div style={{ background:SAND, borderRadius:10, padding:'10px 12px', fontSize:12, color:GOLD_D, marginBottom:10, wordBreak:'break-all', fontWeight:600 }}>
        {refLink}
      </div>
      <div style={{ display:'flex', gap:8 }}>
        <button style={{ ...S.btn(GOLD), flex:2, padding:'11px' }} onClick={share}>📤 Поделиться</button>
        <button style={{ ...S.btnGhost(GOLD), flex:1, padding:'11px' }} onClick={copy}>{copied?'✓':'Копировать'}</button>
      </div>
    </div>
  );
}

// ── PRODUCT CHAT ──────────────────────────────────────────────
function ProductChat({ customer, products, photos, onAddToCart, onNeedAuth }) {
  const [messages, setMessages] = useState([]);
  const [text, setText]         = useState('');
  const [shareMode, setShareMode] = useState(false);
  const [search, setSearch]     = useState('');
  const bottomRef = useRef(null);

  useEffect(()=>{
    const unsub = onSnapshot(
      query(collection(db,'shop_chat'), orderBy('date','asc')),
      snap => {
        setMessages(snap.docs.map(d=>({id:d.id,...d.data()})));
        setTimeout(()=>bottomRef.current?.scrollIntoView({behavior:'smooth'}), 100);
      }
    );
    return()=>unsub();
  },[]);

  const send = async () => {
    if (!customer) { onNeedAuth(); return; }
    if (!text.trim()) return;
    await addDoc(collection(db,'shop_chat'),{
      customerId:customer.id, customerName:customer.name,
      type:'text', text:text.trim(), date:nowStr()
    });
    setText('');
  };

  const shareProduct = async (product) => {
    if (!customer) { onNeedAuth(); return; }
    await addDoc(collection(db,'shop_chat'),{
      customerId:customer.id, customerName:customer.name,
      type:'product',
      productId:product.id, productName:product.name,
      productPrice:product.price, productPhoto:photos[product.id]||'',
      date:nowStr()
    });
    setShareMode(false);
    setSearch('');
  };

  const filtered = products.filter(p=>!p.transit&&(p.qty-(p.reserved||0))>0&&
    (!search||p.name.toLowerCase().includes(search.toLowerCase())));

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'calc(100vh - 130px)' }}>
      {/* Messages */}
      <div style={{ flex:1, overflowY:'auto', padding:'12px 14px', display:'flex', flexDirection:'column', gap:8 }}>
        {messages.length===0 && (
          <div style={{ textAlign:'center', padding:'40px 0', color:MUTED }}>
            <div style={{ fontSize:36, marginBottom:10 }}>💬</div>
            <div style={{ fontSize:14, fontWeight:600 }}>Будь первым — поделись любимым товаром!</div>
          </div>
        )}
        {messages.map(msg=>(
          <div key={msg.id} style={{ display:'flex', gap:8, alignItems:'flex-start' }}>
            <div style={{ width:32, height:32, borderRadius:'50%', background:`linear-gradient(135deg,${GOLD},${GOLD_D})`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, color:'#fff', fontWeight:700, flexShrink:0 }}>
              {msg.customerName?.[0]?.toUpperCase()||'?'}
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:11, color:MUTED, marginBottom:3, fontWeight:600 }}>{msg.customerName}</div>
              {msg.type==='text' && (
                <div style={{ background:SAND, borderRadius:'0 12px 12px 12px', padding:'9px 12px', fontSize:14, color:INK, display:'inline-block', maxWidth:'85%' }}>{msg.text}</div>
              )}
              {msg.type==='product' && (
                <div style={{ ...S.card, maxWidth:220, overflow:'visible' }}>
                  <div style={{ height:120, background:BG }}>
                    {msg.productPhoto ? <img src={msg.productPhoto} style={{ width:'100%', height:'100%', objectFit:'cover' }}/> : <div style={{ height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:32 }}>👞</div>}
                  </div>
                  <div style={{ padding:10 }}>
                    <div style={{ fontSize:13, fontWeight:700, color:INK }}>{msg.productName}</div>
                    <div style={{ fontSize:15, fontWeight:800, color:GOLD_D, marginTop:3 }}>{fmt(msg.productPrice)} сом</div>
                    <button style={{ ...S.btn(GOLD), padding:'8px', fontSize:12, marginTop:8 }}
                      onClick={()=>{const p=products.find(x=>x.id===msg.productId);if(p)onAddToCart({...p,photo:msg.productPhoto,size:'',qty:1,total:p.price});}}>
                      🛍 В корзину
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef}/>
      </div>

      {/* Share product picker */}
      {shareMode && (
        <div style={{ background:PAPER, borderTop:`1px solid ${LINE}`, padding:12, maxHeight:240, overflowY:'auto' }}>
          <input style={{ ...S.input, marginBottom:8, fontSize:13 }} value={search} onChange={e=>setSearch(e.target.value)} placeholder="Найти товар..."/>
          {filtered.slice(0,10).map(p=>(
            <div key={p.id} onClick={()=>shareProduct(p)}
              style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 4px', cursor:'pointer', borderBottom:`1px solid ${LINE}` }}>
              <div style={{ width:36, height:36, borderRadius:8, background:BG, overflow:'hidden', flexShrink:0 }}>
                {photos[p.id]?<img src={photos[p.id]} style={{ width:'100%', height:'100%', objectFit:'cover' }}/>:<div style={{ height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>👞</div>}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:600, color:INK }}>{p.name}</div>
                <div style={{ fontSize:12, color:GOLD_D }}>{fmt(p.price)} сом</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Input */}
      <div style={{ background:PAPER, borderTop:`1px solid ${LINE}`, padding:'10px 12px', display:'flex', gap:8 }}>
        <button style={{ ...S.btnGhost(GOLD), padding:'10px 12px', flexShrink:0, fontSize:16 }} onClick={()=>setShareMode(!shareMode)}>
          {shareMode?'✕':'👟'}
        </button>
        <input style={{ ...S.input, flex:1, padding:'10px 12px', fontSize:14 }}
          value={text} onChange={e=>setText(e.target.value)}
          onKeyDown={e=>{if(e.key==='Enter')send();}}
          placeholder={customer?'Написать...':'Войди чтобы написать'}/>
        <button style={{ ...S.btn(GOLD), padding:'10px 14px', width:'auto', flexShrink:0 }} onClick={send}>→</button>
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
  const [favs, setFavs]         = useState([]);
  const [customer, setCustomer] = useState(null);
  const [screen, setScreen]     = useState('catalog');
  const [showAuth, setShowAuth] = useState(false);
  const [showOrder, setShowOrder] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showFaq, setShowFaq]   = useState(false);
  const [discount, setDiscount] = useState(0);
  const [search, setSearch]     = useState('');
  const [sortBy, setSortBy]     = useState('default');
  const [toasts, setToasts]     = useState([]);
  const [showFavOnly, setShowFavOnly] = useState(false);
  const [city, setCity]             = useState('');
  const [showCitySelector, setShowCitySelector] = useState(false);
  const [screen2, setScreen2]       = useState(''); // 'chat'
  const [refCode, setRefCode]       = useState('');

  const addToast = (msg) => {
    const id = Date.now();
    setToasts(p=>[...p,{id,msg}]);
    setTimeout(()=>setToasts(p=>p.filter(t=>t.id!==id)),3000);
  };

  useEffect(()=>{
    try {
      const c = localStorage.getItem('qs_customer');
      const f = localStorage.getItem('qs_favs');
      const ci = localStorage.getItem('qs_city');
      if(c) setCustomer(JSON.parse(c));
      if(f) setFavs(JSON.parse(f));
      if(ci) setCity(ci); else setShowCitySelector(true);
      // Check referral code in URL
      const params = new URLSearchParams(window.location.search);
      const ref = params.get('ref');
      if(ref) { setRefCode(ref); try{ localStorage.setItem('qs_ref', ref); }catch{} }
      else { try{ const r=localStorage.getItem('qs_ref'); if(r)setRefCode(r); }catch{} }
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

  const login = async (c) => {
    setCustomer(c);
    try{ localStorage.setItem('qs_customer',JSON.stringify(c)); }catch{}
    // Apply referral discount if came via ref link
    if(refCode && refCode !== c.id){
      try{
        // Give new user 10% referral discount
        await setDoc(doc(db,'shop_customers',c.id),{...c,refDiscount:10},{merge:true});
        // Give referrer 10% discount too
        const refSnap=await getDoc(doc(db,'shop_customers',refCode));
        if(refSnap.exists()) await setDoc(doc(db,'shop_customers',refCode),{refDiscount:10},{merge:true});
        setRefCode('');
        localStorage.removeItem('qs_ref');
      }catch{}
    }
  };
  const saveCity = (c) => { setCity(c); try{ localStorage.setItem('qs_city',c); }catch{}; };
  const logout = () => { setCustomer(null); try{ localStorage.removeItem('qs_customer'); }catch{}; setScreen('catalog'); };

  const toggleFav = (id) => {
    const willAdd = !favs.includes(id);
    const next = willAdd ? [...favs, id] : favs.filter(f=>f!==id);
    setFavs(next);
    try { localStorage.setItem('qs_favs', JSON.stringify(next)); } catch {}
    if(willAdd) addToast('❤️ Добавлено в избранное');
  };

  const addToCart = (item) => { setCart(p=>[...p,item]); addToast('🛍 Добавлено в корзину'); };
  const removeFromCart = (i) => setCart(p=>p.filter((_,idx)=>idx!==i));
  const checkout = (d) => { setDiscount(d); setScreen('catalog'); setShowOrder(true); };
  const onOrderSuccess = () => { setCart([]); setShowOrder(false); setShowSuccess(true); };

  // "Hit" products — top 3 by lowest stock ratio, simple deterministic heuristic
  const hitIds = [...products]
    .sort((a,b)=>(a.qty-(a.reserved||0))-(b.qty-(b.reserved||0)))
    .slice(0,3).map(p=>p.id);

  let filtered = products.filter(p=>{
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
    const matchFav = !showFavOnly || favs.includes(p.id);
    const matchCity = !city || !p.region || p.region==='both' || p.region===city;
    return matchSearch && matchFav && matchCity;
  });
  if(sortBy==='price_asc')  filtered = [...filtered].sort((a,b)=>a.price-b.price);
  if(sortBy==='price_desc') filtered = [...filtered].sort((a,b)=>b.price-a.price);

  if(loading) return(
    <div style={{ background:BG, minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:14 }}>
      <style>{`${FONTS}*{box-sizing:border-box;margin:0;padding:0;}`}</style>
      <div style={{ fontFamily:"'Playfair Display',serif", fontSize:26, color:INK, fontWeight:700 }}>Queen <span style={{color:GOLD}}>Star</span></div>
      <div style={{ fontSize:12, color:MUTED }}>Загрузка каталога...</div>
    </div>
  );

  return(
    <div style={{ background:BG, minHeight:'100vh', color:INK, fontFamily:"'Manrope',sans-serif" }}>
      <style>{`${FONTS}*{box-sizing:border-box;margin:0;padding:0;}input::placeholder,textarea::placeholder{color:#B8A98E;}button:disabled{opacity:0.6;}`}</style>
      <Toast toasts={toasts}/>
      <Header cartCount={cart.length} favCount={favs.length}
        onCart={()=>setScreen('cart')}
        onAccount={()=>customer?setScreen('account'):setShowAuth(true)}
        onFav={()=>setShowFavOnly(!showFavOnly)}
        onFaq={()=>setShowFaq(true)}
        customer={customer}/>

      {showCitySelector && <CitySelector city={city} setCity={saveCity} onClose={()=>setShowCitySelector(false)}/>}
      {showAuth && <AuthModal onClose={()=>setShowAuth(false)} onLogin={login}/>}
      {screen2==='chat' && (
        <div style={{ position:'fixed', inset:0, background:BG, zIndex:200 }}>
          <div style={{ background:PAPER, borderBottom:`1px solid ${LINE}`, padding:'13px 16px', display:'flex', alignItems:'center', gap:12 }}>
            <button onClick={()=>setScreen2('')} style={{ background:'none', border:'none', fontSize:22, cursor:'pointer', color:INK }}>←</button>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:17, color:INK, fontWeight:700 }}>💬 Чат покупателей</div>
          </div>
          <ProductChat customer={customer} products={products} photos={photos} onAddToCart={addToCart} onNeedAuth={()=>{setScreen2('');setShowAuth(true);}}/>
        </div>
      )}
      {showSuccess && <SuccessPage onClose={()=>setShowSuccess(false)}/>}
      {showOrder && customer && <OrderForm cart={cart} customer={customer} discount={discount} onClose={()=>setShowOrder(false)} onSuccess={onOrderSuccess}/>}
      {showFaq && (
        <div style={{ position:'fixed', inset:0, background:'rgba(35,26,20,0.4)', zIndex:300, display:'flex', alignItems:'flex-end', justifyContent:'center' }} onClick={()=>setShowFaq(false)}>
          <div style={{ background:BG, borderRadius:'24px 24px 0 0', padding:20, width:'100%', maxWidth:480, maxHeight:'80vh', overflowY:'auto' }} onClick={e=>e.stopPropagation()}>
            <div style={{ width:36, height:4, background:LINE, borderRadius:2, margin:'0 auto 14px' }}/>
            <FaqSection/>
            <button style={{ ...S.btn(GOLD), marginTop:16 }} onClick={()=>setShowFaq(false)}>Закрыть</button>
          </div>
        </div>
      )}
      {screen==='cart' && <CartPage cart={cart} onClose={()=>setScreen('catalog')} onCheckout={checkout} onRemove={removeFromCart} customer={customer} onNeedAuth={()=>{setScreen('catalog');setShowAuth(true);}}/>}
      {screen==='account' && customer && <AccountPage customer={customer} onClose={()=>setScreen('catalog')} onLogout={logout} addToast={addToast}/>}

      {screen==='catalog' && (
        <div style={{ ...S.page, padding:'14px 14px 30px' }}>
          {/* Banner */}
          <div style={{ background:`linear-gradient(135deg,${INK},#3A2C20)`, borderRadius:20, padding:'22px 20px', marginBottom:16, color:'#fff', textAlign:'center', position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', top:-30, right:-30, width:110, height:110, borderRadius:'50%', background:GOLD+'22' }}/>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:25, letterSpacing:0.5, marginBottom:5, fontWeight:700, position:'relative' }}>Queen <span style={{color:GOLD_L}}>Star</span></div>
            <div style={{ fontSize:12, opacity:0.8, marginBottom:14, position:'relative' }}>Женская обувь · Душанбе · Доставка по городу</div>
            <div style={{ display:'flex', justifyContent:'center', gap:14, flexWrap:'wrap', position:'relative' }}>
              {['🚚 Доставка','💳 Нал/Перевод','📦 Возврат 7 дней'].map(t=>(
                <div key={t} style={{ fontSize:10.5, opacity:0.85, fontWeight:600 }}>{t}</div>
              ))}
            </div>
          </div>

          <div style={{ marginBottom:10 }}><StoreHours/></div>
          <div style={{ display:'flex', gap:8, marginBottom:10, alignItems:'center' }}>
            <button onClick={()=>setShowCitySelector(true)}
              style={{ ...S.btnGhost(city==='russia'?'#4A6FA5':GOLD), fontSize:12, padding:'7px 12px' }}>
              {city==='russia'?'🇷🇺 Россия':'🇹🇯 Душанбе'}
            </button>
            <button onClick={()=>setScreen2('chat')}
              style={{ ...S.btnGhost(BLUE), fontSize:12, padding:'7px 12px' }}>
              💬 Чат покупателей
            </button>
          </div>
          <FlashSaleBanner/>

          {/* Search */}
          <div style={{ position:'relative', marginBottom:10 }}>
            <input style={{ ...S.input, paddingLeft:42 }} value={search} onChange={e=>setSearch(e.target.value)} placeholder="Поиск товаров..."/>
            <span style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', fontSize:16, color:MUTED }}>🔍</span>
          </div>

          {/* Filters */}
          <div style={{ display:'flex', gap:7, overflowX:'auto', marginBottom:14, paddingBottom:2 }}>
            <div onClick={()=>setShowFavOnly(!showFavOnly)} style={S.chip(showFavOnly)}>❤️ Избранное{favs.length>0?` (${favs.length})`:''}</div>
            <div onClick={()=>setSortBy('default')} style={S.chip(sortBy==='default')}>По умолчанию</div>
            <div onClick={()=>setSortBy('price_asc')} style={S.chip(sortBy==='price_asc')}>Цена ↑</div>
            <div onClick={()=>setSortBy('price_desc')} style={S.chip(sortBy==='price_desc')}>Цена ↓</div>
          </div>

          <div style={{ fontSize:12, color:MUTED, marginBottom:12, fontWeight:600 }}>{filtered.length} товаров</div>

          {filtered.length===0 ? (
            <div style={{ textAlign:'center', padding:'50px 0', color:MUTED }}>
              <div style={{ fontSize:38, marginBottom:12 }}>😔</div>
              {showFavOnly ? 'Нет избранных товаров' : 'Ничего не найдено'}
            </div>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              {filtered.map(p=>(
                <ProductCard key={p.id} product={p} photo={photos[p.id]}
                  onAddToCart={addToCart} isFav={favs.includes(p.id)} onToggleFav={toggleFav}
                  isHit={hitIds.includes(p.id)}/>
              ))}
            </div>
          )}

          {/* Social proof */}
          <div style={{ ...S.card, padding:18, marginTop:22, textAlign:'center' }}>
            <div style={{ fontSize:26, marginBottom:4 }}>🏆</div>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:17, fontWeight:700, color:INK }}>500+ довольных покупателей</div>
            <div style={{ fontSize:12, color:MUTED, marginTop:4 }}>в Душанбе и по всему Таджикистану</div>
          </div>

          {/* FAQ */}
          <div style={{ marginTop:14 }}><FaqSection/></div>

          {/* Contact */}
          <div style={{ ...S.card, padding:18, marginTop:14, textAlign:'center' }}>
            <div style={{ fontSize:14, fontWeight:700, color:INK, marginBottom:12 }}>Связаться с нами</div>
            <div style={{ display:'flex', gap:10, justifyContent:'center', flexWrap:'wrap' }}>
              <a href="https://t.me/queenstar_shop" target="_blank" style={{ ...S.btnGhost(BLUE), textDecoration:'none', display:'inline-block' }}>📱 Telegram</a>
              <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" style={{ ...S.btnGhost(GREEN), textDecoration:'none', display:'inline-block' }}>💬 WhatsApp</a>
              <a href="https://instagram.com/queenstar.shop" target="_blank" style={{ ...S.btnGhost(GOLD), textDecoration:'none', display:'inline-block' }}>📸 Instagram</a>
            </div>
            <div style={{ fontSize:11, color:MUTED, marginTop:14 }}>Душанбе, Таджикистан</div>
          </div>
        </div>
      )}
    </div>
  );
}
