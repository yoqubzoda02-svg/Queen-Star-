import { useState, useEffect, useRef, useContext, createContext } from "react";
import { db, messaging } from './firebase.js';
import { doc, getDoc, getDocs, addDoc, collection, onSnapshot, query, where, setDoc, orderBy, arrayUnion, updateDoc } from 'firebase/firestore';
import { getToken, onMessage } from 'firebase/messaging';

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
// photos[id] may be stored as a single URL string or an array of URLs — always take one valid photo
const firstPhoto = (ph) => Array.isArray(ph) ? ph[0] : ph;

// ── CURRENCY (prices are stored in сом; show converted for Russia region) ──
const SOM_TO_RUB = 9.3; // ⚙️ обновляйте курс здесь при необходимости
const priceStr = (amount, city) => city==='russia' ? `${fmt(amount*SOM_TO_RUB)} ₽` : `${fmt(amount)} сом`;
const CityContext = createContext('dushanbe');
const useCity = () => useContext(CityContext);

// ── DELIVERY FEE ────────────────────────────────────────────────
const DELIVERY_FEE = 15; // сом, доставка по Душанбе
const FREE_DELIVERY_MIN = 500; // бесплатная доставка при заказе от этой суммы

// ── LANGUAGE (ru / tj / en) ───────────────────────────────────
const LANG_LABEL = { ru:'RU', tj:'TJ', en:'EN' };
const DICT = {
  ru: {
    tagline:'Женская обувь · Душанбе · Доставка по городу',
    perk_delivery:'🚚 Доставка', perk_pay:'💳 Нал/Перевод', perk_return:'📦 Возврат 7 дней',
    all:'Все товары', boots:'Сапоги', heels:'Каблуки', sandals:'Босоножки', sneakers:'Кроссовки', flats:'Балетки', slippers:'Тапочки',
    popular:'Популярное', new_:'Новинки', price_up:'Цена ↑', price_down:'Цена ↓', filters:'⚙️ Фильтры', consultant:'💬 Консультант',
    search_ph:'Поиск товаров...', products_count:(n)=>`${n} товаров`, nothing_found:'Ничего не найдено', no_favs:'Нет избранных товаров',
    cart:'Корзина', cart_empty:'Корзина пуста', cart_empty_sub:'Добавь товары из каталога', promo:'🎁 Промокод', promo_ph:'Введи промокод', apply:'Применить',
    total:'Итого', checkout:'Оформить заказ →', login_checkout:'Войти и оформить →', delivery_fee:'Доставка', delivery_free:'бесплатно',
    account:'Мой аккаунт', logout:'Выйти', orders_history:'История заказов', no_orders:'Заказов пока нет',
    login_title:'Вход в аккаунт', register_title:'Создать аккаунт', phone_label:'Номер телефона', continue_:'Продолжить →', pin_label:'PIN-код (4 цифры)', pin_set_label:'Придумай PIN-код (4 цифры)', name_label:'Твоё имя',
    faq_title:'Частые вопросы', contact_us:'Связаться с нами',
    checkout_title:'Оформление', delivery_type:'Способ получения', delivery:'🚚 Доставка', pickup:'🏬 Самовывоз', address:'Адрес доставки', payment:'Оплата', cash:'💵 Наличные', transfer:'📲 Перевод', note:'Заметка', confirm_order:'Подтвердить заказ →',
    order_success:'Заказ принят!', back_to_catalog:'← Вернуться в каталог',
  },
  tj: {
    tagline:'Пойафзоли занона · Душанбе · Расонидан дар шаҳр',
    perk_delivery:'🚚 Расонидан', perk_pay:'💳 Нақд/Кӯчонидан', perk_return:'📦 Бозгашт 7 рӯз',
    all:'Ҳама молҳо', boots:'Мӯза', heels:'Пошна', sandals:'Сандал', sneakers:'Кроссовка', flats:'Балетка', slippers:'Пойафзоли хона',
    popular:'Маъмултарин', new_:'Наврасидаҳо', price_up:'Нарх ↑', price_down:'Нарх ↓', filters:'⚙️ Филтрҳо', consultant:'💬 Мушовир',
    search_ph:'Ҷустуҷӯи мол...', products_count:(n)=>`${n} мол`, nothing_found:'Чизе ёфт нашуд', no_favs:'Молҳои интихобшуда нест',
    cart:'Сабад', cart_empty:'Сабад холист', cart_empty_sub:'Аз каталог мол илова кун', promo:'🎁 Рамзи тахфиф', promo_ph:'Рамзро ворид кун', apply:'Татбиқ кардан',
    total:'Ҳамагӣ', checkout:'Фармоиш додан →', login_checkout:'Даромадан ва фармоиш →', delivery_fee:'Расонидан', delivery_free:'ройгон',
    account:'Ҳисоби ман', logout:'Баромадан', orders_history:'Таърихи фармоишҳо', no_orders:'Ҳанӯз фармоише нест',
    login_title:'Воридшавӣ', register_title:'Сохтани ҳисоб', phone_label:'Рақами телефон', continue_:'Идома →', pin_label:'Рамзи PIN (4 рақам)', pin_set_label:'Рамзи PIN созед (4 рақам)', name_label:'Номи шумо',
    faq_title:'Саволҳои маъмул', contact_us:'Бо мо тамос гиред',
    checkout_title:'Расмиёт', delivery_type:'Тарзи гирифтан', delivery:'🚚 Расонидан', pickup:'🏬 Худгирӣ', address:'Суроғаи расонидан', payment:'Пардохт', cash:'💵 Нақд', transfer:'📲 Кӯчонидан', note:'Қайд', confirm_order:'Тасдиқ кардани фармоиш →',
    order_success:'Фармоиш қабул шуд!', back_to_catalog:'← Бозгашт ба каталог',
  },
  en: {
    tagline:"Women's shoes · Dushanbe · City delivery",
    perk_delivery:'🚚 Delivery', perk_pay:'💳 Cash/Transfer', perk_return:'📦 7-day returns',
    all:'All items', boots:'Boots', heels:'Heels', sandals:'Sandals', sneakers:'Sneakers', flats:'Flats', slippers:'Slippers',
    popular:'Popular', new_:'New', price_up:'Price ↑', price_down:'Price ↓', filters:'⚙️ Filters', consultant:'💬 Consultant',
    search_ph:'Search products...', products_count:(n)=>`${n} products`, nothing_found:'Nothing found', no_favs:'No favorites yet',
    cart:'Cart', cart_empty:'Cart is empty', cart_empty_sub:'Add products from the catalog', promo:'🎁 Promo code', promo_ph:'Enter promo code', apply:'Apply',
    total:'Total', checkout:'Checkout →', login_checkout:'Log in and checkout →', delivery_fee:'Delivery', delivery_free:'free',
    account:'My account', logout:'Log out', orders_history:'Order history', no_orders:'No orders yet',
    login_title:'Log in', register_title:'Create account', phone_label:'Phone number', continue_:'Continue →', pin_label:'PIN code (4 digits)', pin_set_label:'Create a PIN code (4 digits)', name_label:'Your name',
    faq_title:'FAQ', contact_us:'Contact us',
    checkout_title:'Checkout', delivery_type:'Delivery method', delivery:'🚚 Delivery', pickup:'🏬 Pickup', address:'Delivery address', payment:'Payment', cash:'💵 Cash', transfer:'📲 Transfer', note:'Note', confirm_order:'Confirm order →',
    order_success:'Order placed!', back_to_catalog:'← Back to catalog',
  },
};
const LangContext = createContext('ru');
const useLang = () => { const lang = useContext(LangContext); return { lang, t:(key)=> (DICT[lang]||DICT.ru)[key] }; };

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

const WHATSAPP_NUMBER = '992876982424';

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
    <div className="qs-fade-in" style={{ position:'fixed', inset:0, background:'rgba(35,26,20,0.4)', zIndex:400, display:'flex', alignItems:'flex-end', justifyContent:'center' }}>
      <div className="qs-sheet-in" style={{ background:PAPER, borderRadius:'24px 24px 0 0', padding:24, width:'100%', maxWidth:480 }}>
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
  const { t } = useLang();
  return (
    <div style={{ ...S.card, padding:'6px 18px 6px' }}>
      <div style={{ fontFamily:"'Playfair Display',serif", fontSize:17, fontWeight:700, color:INK, padding:'14px 0 4px' }}>{t('faq_title')}</div>
      {FAQ.map((f,i)=><FaqItem key={i} q={f.q} a={f.a}/>)}
    </div>
  );
}

// ── PRIVACY POLICY ─────────────────────────────────────────────
function PrivacyPolicy() {
  return (
    <div style={{ ...S.card, padding:18 }}>
      <div style={{ fontFamily:"'Playfair Display',serif", fontSize:17, fontWeight:700, color:INK, marginBottom:12 }}>Политика конфиденциальности</div>
      <div style={{ fontSize:13, color:MUTED, lineHeight:1.8 }}>
        <p style={{ marginBottom:10 }}>Для оформления заказа мы собираем ваше имя и номер телефона. Эти данные используются только для обработки и доставки заказа, связи с вами по поводу статуса заказа и программы лояльности.</p>
        <p style={{ marginBottom:10 }}>Мы не передаём ваши данные третьим лицам, кроме случаев, необходимых для доставки заказа (например, курьерской службе).</p>
        <p style={{ marginBottom:10 }}>История заказов, отзывы и фото, которые вы добавляете, привязаны к вашему аккаунту (номер телефона + PIN-код) и видны только вам и продавцу.</p>
        <p style={{ marginBottom:10 }}>Вы можете в любой момент попросить удалить свои данные, написав нам в WhatsApp или Telegram — контакты указаны на главной странице.</p>
      </div>
    </div>
  );
}

// ── HEADER ────────────────────────────────────────────────────
function Header({ cartCount, favCount, onCart, onAccount, onFav, onFaq, customer }) {
  return (
    <div style={{ background:PAPER, borderBottom:`1px solid ${LINE}`, padding:'14px 16px', display:'flex', justifyContent:'space-between', alignItems:'center', position:'sticky', top:0, zIndex:50 }}>
      <div style={{ display:'flex', alignItems:'center', gap:9 }}>
        <img src="/logo.png" alt="Queen Star" style={{ width:34, height:34, borderRadius:'50%', flexShrink:0 }}/>
        <div>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:20, color:INK, letterSpacing:1, fontWeight:700 }}>Queen <span style={{color:GOLD}}>Star</span></div>
          <div style={{ fontSize:9, color:MUTED, letterSpacing:2.5, marginTop:1, fontWeight:600 }}>ДУШАНБЕ · ТАДЖИКИСТАН</div>
        </div>
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
// Returning customers must confirm a 4-digit PIN tied to their phone number —
// otherwise anyone who knows/guesses a phone number could open a stranger's
// account and order history. New accounts set their PIN during registration;
// older accounts created before this existed are asked to set one on next login.
function AuthModal({ onClose, onLogin }) {
  const [step, setStep]   = useState('phone');
  const [phone, setPhone] = useState('+992');
  const [name, setName]   = useState('');
  const [pin, setPin]     = useState('');
  const [existing, setExisting] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr]     = useState('');

  const check = async () => {
    if (phone.length < 10) { setErr('Введи полный номер'); return; }
    setLoading(true);
    try {
      const id = phone.replace(/\D/g,'');
      const snap = await getDoc(doc(db,'shop_customers',id));
      if (snap.exists()) {
        const data = snap.data();
        setExisting(data);
        setStep(data.pin ? 'pin' : 'setpin');
      } else setStep('name');
    } catch { setErr('Ошибка. Попробуй снова.'); }
    setLoading(false);
  };

  const confirmPin = async () => {
    if (pin !== existing.pin) { setErr('Неверный PIN'); setPin(''); return; }
    onLogin(existing); onClose();
  };

  const register = async () => {
    if (!name.trim()) { setErr('Введи имя'); return; }
    setStep('setpin');
  };

  const savePin = async () => {
    if (!/^\d{4}$/.test(pin)) { setErr('PIN должен быть из 4 цифр'); return; }
    setLoading(true);
    try {
      const id = phone.replace(/\D/g,'');
      const c = { id, name:(existing?.name||name).trim?.()||existing?.name||name, phone, pin, createdAt:existing?.createdAt||nowStr() };
      await setDoc(doc(db,'shop_customers',id), c, { merge:true });
      onLogin(c); onClose();
    } catch { setErr('Ошибка регистрации.'); }
    setLoading(false);
  };

  return (
    <div className="qs-fade-in" style={{ position:'fixed', inset:0, background:'rgba(35,26,20,0.4)', zIndex:300, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ background:PAPER, borderRadius:22, padding:26, maxWidth:340, width:'100%' }}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:18 }}>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:18, color:INK, fontWeight:700 }}>{step==='phone'?'Вход в аккаунт':step==='pin'?'Введи PIN':step==='name'?'Создать аккаунт':'Придумай PIN'}</div>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer', color:MUTED }}>✕</button>
        </div>
        {step==='phone'&&(<>
          <div style={{ fontSize:13, color:MUTED, marginBottom:16 }}>Введи номер — войдём или создадим аккаунт</div>
          <label style={S.label}>Номер телефона</label>
          <input style={{ ...S.input, marginBottom:14, fontSize:17 }} value={phone} onChange={e=>{setPhone(e.target.value);setErr('');}} placeholder="+992 900 000000" type="tel"/>
          {err&&<div style={{ fontSize:12, color:RED, marginBottom:10 }}>{err}</div>}
          <button style={S.btn()} onClick={check} disabled={loading}>{loading?'Проверяем...':'Продолжить →'}</button>
        </>)}
        {step==='pin'&&(<>
          <div style={{ background:SAND, borderRadius:10, padding:11, marginBottom:14, fontSize:13, color:GOLD_D, fontWeight:600 }}>📱 {phone} · {existing?.name}</div>
          <label style={S.label}>PIN-код</label>
          <input style={{ ...S.input, marginBottom:14, textAlign:'center', fontSize:24, letterSpacing:8 }} type="password" inputMode="numeric" maxLength={4}
            value={pin} onChange={e=>{setPin(e.target.value.replace(/\D/g,''));setErr('');}}
            onKeyDown={e=>{if(e.key==='Enter')confirmPin();}} placeholder="••••" autoFocus/>
          {err&&<div style={{ fontSize:12, color:RED, marginBottom:10 }}>{err}</div>}
          <button style={S.btn()} onClick={confirmPin} disabled={loading}>Войти</button>
          <a href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent('Здравствуйте! Забыл(а) PIN от аккаунта, мой номер: '+phone)}`} target="_blank"
            style={{ display:'block', textAlign:'center', fontSize:12, color:BLUE, marginTop:12, textDecoration:'none' }}>Забыли PIN? Написать в WhatsApp</a>
          <button style={{ ...S.btn(MUTED), marginTop:12, opacity:0.8 }} onClick={()=>{setStep('phone');setPin('');setErr('');}}>← Назад</button>
        </>)}
        {step==='name'&&(<>
          <div style={{ background:SAND, borderRadius:10, padding:11, marginBottom:14, fontSize:13, color:GOLD_D, fontWeight:600 }}>📱 {phone}</div>
          <label style={S.label}>Твоё имя</label>
          <input style={{ ...S.input, marginBottom:14 }} value={name} onChange={e=>{setName(e.target.value);setErr('');}} placeholder="Зарина, Малика..." autoFocus/>
          {err&&<div style={{ fontSize:12, color:RED, marginBottom:10 }}>{err}</div>}
          <button style={S.btn()} onClick={register} disabled={loading}>Далее →</button>
          <button style={{ ...S.btn(MUTED), marginTop:8, opacity:0.8 }} onClick={()=>setStep('phone')}>← Назад</button>
        </>)}
        {step==='setpin'&&(<>
          <div style={{ background:SAND, borderRadius:10, padding:11, marginBottom:14, fontSize:13, color:GOLD_D, fontWeight:600 }}>📱 {phone}</div>
          <div style={{ fontSize:13, color:MUTED, marginBottom:14 }}>{existing?'Защити свой аккаунт — придумай PIN из 4 цифр':'Придумай PIN из 4 цифр для входа в следующий раз'}</div>
          <label style={S.label}>Новый PIN-код</label>
          <input style={{ ...S.input, marginBottom:14, textAlign:'center', fontSize:24, letterSpacing:8 }} type="password" inputMode="numeric" maxLength={4}
            value={pin} onChange={e=>{setPin(e.target.value.replace(/\D/g,''));setErr('');}}
            onKeyDown={e=>{if(e.key==='Enter')savePin();}} placeholder="••••" autoFocus/>
          {err&&<div style={{ fontSize:12, color:RED, marginBottom:10 }}>{err}</div>}
          <button style={S.btn()} onClick={savePin} disabled={loading}>{loading?'Сохраняем...':'✓ Сохранить и войти'}</button>
        </>)}
      </div>
    </div>
  );
}

// ── REVIEWS ───────────────────────────────────────────────────
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
    <div className="qs-fade-in" style={{ position:'fixed', inset:0, background:'rgba(35,26,20,0.4)', zIndex:400, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ background:PAPER, borderRadius:22, padding:26, maxWidth:340, width:'100%', textAlign:'center' }}>
        <div style={{ fontSize:46, marginBottom:12 }}>🎉</div>
        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:18, color:INK, fontWeight:700, marginBottom:8 }}>Спасибо за отзыв!</div>
        <button style={{ ...S.btn(GOLD), marginTop:14 }} onClick={onClose}>Закрыть</button>
      </div>
    </div>
  );

  return (
    <div className="qs-fade-in" style={{ position:'fixed', inset:0, background:'rgba(35,26,20,0.4)', zIndex:400, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
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
function AccountPage({ customer, onClose, onLogout, addToast, pushOn, setPushOn, onReorder }) {
  const city = useCity();
  const { t } = useLang();
  const [orders, setOrders]       = useState([]);
  const [reviewFor, setReviewFor] = useState(null);
  const [confirmCancel, setConfirmCancel] = useState(null);
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

  const cancelOrder = async (order) => {
    try {
      await updateDoc(doc(db,'shop_orders',order.id), { status:'cancelled' });
      addToast('Заказ отменён');
      setConfirmCancel(null);
    } catch { addToast('❌ Не удалось отменить заказ'); }
  };

  return (
    <div className="qs-screen-in" style={{ position:'fixed', inset:0, background:BG, zIndex:200, overflowY:'auto' }}>
      {reviewFor && <LeaveReview order={reviewFor} customer={customer} onClose={()=>setReviewFor(null)}/>}
      <div style={{ ...S.page, padding:'16px 16px 80px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:22, cursor:'pointer', color:INK }}>←</button>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:18, color:INK, fontWeight:700 }}>{t('account')}</div>
          <button onClick={onLogout} style={{ background:'none', border:'none', fontSize:11, color:RED, cursor:'pointer', fontWeight:700 }}>{t('logout')}</button>
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
              <div style={{ fontSize:22, fontWeight:800, color:GREEN }}>{priceStr(orders.filter(o=>o.status==='done').reduce((s,o)=>s+o.total,0), city)}</div>
              <div style={{ fontSize:10, color:MUTED, fontWeight:600 }}>потрачено</div>
            </div>
          </div>
        </div>
        <LoyaltyCard customer={customer}/>
        {!pushOn && (
          <div style={{ ...S.card, padding:16, marginBottom:14, display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ fontSize:24 }}>🔔</div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13, fontWeight:700, color:INK }}>Уведомления о заказе</div>
              <div style={{ fontSize:11, color:MUTED }}>Узнавай о статусе заказа даже с закрытым сайтом</div>
            </div>
            <button style={{ ...S.btnGhost(GOLD), padding:'8px 12px', fontSize:12, whiteSpace:'nowrap' }}
              onClick={async()=>{ if(await enablePush(customer, addToast)) setPushOn(true); }}>Включить</button>
          </div>
        )}
        <ReferralBlock customer={customer}/>
        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:16, color:INK, fontWeight:700, marginBottom:12 }}>{t('orders_history')}</div>
        {orders.length===0 ? (
          <div style={{ textAlign:'center', padding:'40px 0', color:MUTED }}>
            <div style={{ fontSize:38, marginBottom:10 }}>📦</div>
            {t('no_orders')}
          </div>
        ) : orders.map(o=>{
          const st = ST[o.status]||ST.new;
          return (
            <div key={o.id} style={{ ...S.card, padding:15, marginBottom:11 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                <div style={{ fontSize:14, fontWeight:700, color:INK }}>{o.productName}</div>
                <div style={{ fontSize:16, fontWeight:800, color:GOLD_D }}>{priceStr(o.total, city)}</div>
              </div>
              <div style={{ fontSize:12, color:MUTED, marginBottom:9 }}>р.{o.size} · {o.qty} шт · {new Date(o.date).toLocaleDateString('ru-RU')}</div>
              <OrderTimeline status={o.status}/>
              {o.status==='done' && (
                <button style={{ ...S.btnGhost(GOLD), padding:'7px 12px', fontSize:12, marginTop:8 }} onClick={()=>setReviewFor(o)}>⭐ Оставить отзыв</button>
              )}
              {(o.status==='done'||o.status==='cancelled') && (
                <button style={{ ...S.btnGhost(BLUE), padding:'7px 12px', fontSize:12, marginTop:8, marginLeft:8 }} onClick={()=>onReorder(o)}>🔁 Повторить заказ</button>
              )}
              {o.status==='new' && (
                <button style={{ ...S.btnGhost(RED), padding:'7px 12px', fontSize:12, marginTop:8 }} onClick={()=>confirmCancel===o.id?cancelOrder(o):setConfirmCancel(o.id)}>
                  {confirmCancel===o.id?'⚠ Нажмите ещё раз для отмены':'✕ Отменить заказ'}
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
function CartPage({ cart, onClose, onCheckout, onRemove, onQtyChange, customer, onNeedAuth }) {
  const city = useCity();
  const { t } = useLang();
  const [firstOrderBonus, setFirstOrderBonus] = useState(false);
  const [checkedBonus, setCheckedBonus] = useState(false);
  const [promo, setPromo]       = useState('');
  const [discount, setDiscount] = useState(0);
  const [promoMsg, setPromoMsg] = useState('');

  const subtotal = cart.reduce((s,x)=>s+x.total,0);
  const effectiveDiscount = discount>0 ? discount : (firstOrderBonus ? 10 : 0);
  const total = Math.round(subtotal * (1 - effectiveDiscount/100));
  const deliveryFee = total >= FREE_DELIVERY_MIN ? 0 : DELIVERY_FEE;

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
    <div className="qs-screen-in" style={{ position:'fixed', inset:0, background:BG, zIndex:200, overflowY:'auto' }}>
      <div style={{ ...S.page, padding:'16px 16px 170px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:22, cursor:'pointer', color:INK }}>←</button>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:18, color:INK, fontWeight:700 }}>{t('cart')} ({cart.length})</div>
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
            <div style={{ fontSize:16, fontWeight:700, color:INK, marginBottom:6 }}>{t('cart_empty')}</div>
            <div style={{ fontSize:13 }}>{t('cart_empty_sub')}</div>
          </div>
        ) : (<>
          {cart.map((item,i)=>(
            <div key={i} style={{ ...S.card, padding:14, marginBottom:11, display:'flex', gap:13 }}>
              <div style={{ width:68, height:68, borderRadius:12, background:BG, overflow:'hidden', flexShrink:0 }}>
                {item.photo ? <img src={item.photo} style={{ width:'100%', height:'100%', objectFit:'contain', background:BG }}/> : <div style={{ height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:26 }}>👞</div>}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:14, fontWeight:700, color:INK }}>{item.name}</div>
                <div style={{ fontSize:12, color:MUTED, marginTop:2 }}>Размер {item.size}</div>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginTop:6 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:0, border:`1.5px solid ${LINE}`, borderRadius:8, overflow:'hidden' }}>
                    <button onClick={()=>onQtyChange(i,-1)} style={{ background:BG, border:'none', width:26, height:26, cursor:'pointer', fontSize:14, fontWeight:700, color:INK }}>−</button>
                    <div style={{ width:28, textAlign:'center', fontSize:13, fontWeight:700, color:INK }}>{item.qty}</div>
                    <button onClick={()=>onQtyChange(i,1)} style={{ background:BG, border:'none', width:26, height:26, cursor:'pointer', fontSize:14, fontWeight:700, color:INK }}>+</button>
                  </div>
                  <div style={{ fontSize:15, fontWeight:800, color:GOLD_D }}>{priceStr(item.total, city)}</div>
                </div>
              </div>
              <button onClick={()=>onRemove(i)} style={{ background:'none', border:'none', color:MUTED, fontSize:16, cursor:'pointer', alignSelf:'flex-start' }}>✕</button>
            </div>
          ))}
          <div style={{ ...S.card, padding:15, marginTop:6 }}>
            <div style={{ fontSize:12, color:MUTED, marginBottom:9, fontWeight:700 }}>{t('promo')}</div>
            <div style={{ display:'flex', gap:8 }}>
              <input style={{ ...S.input, flex:1, padding:'10px 12px', fontSize:14 }} value={promo} onChange={e=>setPromo(e.target.value)} placeholder={t('promo_ph')}/>
              <button style={{ ...S.btnGhost(GOLD), whiteSpace:'nowrap' }} onClick={applyPromo}>{t('apply')}</button>
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
              <div style={{ fontSize:13, color:GREEN, fontWeight:700 }}>− {priceStr(subtotal-total, city)}</div>
            </div>}
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
              <div style={{ fontSize:13, color:MUTED }}>{t('delivery_fee')}</div>
              <div style={{ fontSize:13, color:deliveryFee?INK:GREEN, fontWeight:700 }}>{deliveryFee ? priceStr(deliveryFee, city) : t('delivery_free')}</div>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:14 }}>
              <div style={{ fontSize:14, color:MUTED, fontWeight:600 }}>{t('total')}</div>
              <div style={{ fontSize:23, fontWeight:800, color:GOLD_D }}>{priceStr(total+deliveryFee, city)}</div>
            </div>
            <button style={S.btn()} onClick={customer?()=>onCheckout(effectiveDiscount):onNeedAuth}>
              {customer?t('checkout'):t('login_checkout')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── ORDER FORM ────────────────────────────────────────────────
function OrderForm({ cart, customer, discount, onClose, onSuccess }) {
  const city = useCity();
  const { t } = useLang();
  const [deliveryType, setDeliveryType] = useState('delivery');
  const [address, setAddress] = useState('');
  const [payment, setPayment] = useState('cash');
  const [note, setNote]       = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr]         = useState('');

  const subtotal = cart.reduce((s,x)=>s+x.total,0);
  const total = Math.round(subtotal*(1-discount/100));
  const deliveryFee = deliveryType==='delivery' && total < FREE_DELIVERY_MIN ? DELIVERY_FEE : 0;
  const grandTotal = total + deliveryFee;

  const submit = async () => {
    if(deliveryType==='delivery' && !address.trim()){ setErr('Укажи адрес доставки'); return; }
    setLoading(true); setErr('');
    try {
      await Promise.all(cart.map((item,i)=>addDoc(collection(db,'shop_orders'),{
        customerName:customer.name, customerPhone:customer.phone, customerId:customer.id,
        productId:item.id, productName:item.name, qty:item.qty, price:item.price,
        total:Math.round(item.total*(1-discount/100)), size:item.size,
        deliveryType, address:deliveryType==='delivery'?address.trim():'Самовывоз из магазина',
        deliveryFee: i===0 ? deliveryFee : 0,
        payment, note:note.trim(),
        status:'new', source:'shop', date:nowStr(), discount
      })));
      // +5 сом кешбек за каждый заказ
      try {
        const phoneId = customer.phone.replace(/\D/g,'');
        const custSnap = await getDoc(doc(db,'shop_customers', phoneId));
        const prevPoints = custSnap.exists() ? (custSnap.data().loyaltyPoints||0) : 0;
        await setDoc(doc(db,'shop_customers', phoneId), { loyaltyPoints: prevPoints + 5 }, { merge: true });
      } catch(le){ console.warn('Cashback:', le); }
      const lines = cart.map(item=>`• ${item.name} р.${item.size} × ${item.qty} — ${priceStr(Math.round(item.total*(1-discount/100)), city)}`);
      const summary = [
        `Новый заказ от ${customer.name} (${customer.phone}):`,
        ...lines,
        deliveryType==='delivery' ? `Доставка: ${address.trim()}` : 'Самовывоз из магазина',
        `Оплата: ${payment==='cash'?'наличные':'перевод'}`,
        note.trim() ? `Заметка: ${note.trim()}` : null,
        `Итого: ${priceStr(grandTotal, city)}`,
      ].filter(Boolean).join('\n');
      onSuccess(summary);
    } catch { setErr('Ошибка. Попробуй снова.'); }
    setLoading(false);
  };

  return (
    <div className="qs-screen-in" style={{ position:'fixed', inset:0, background:BG, zIndex:300, overflowY:'auto' }}>
      <div style={{ maxWidth:480, margin:'0 auto', padding:'16px 16px 120px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:22, cursor:'pointer', color:INK }}>←</button>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:18, color:INK, fontWeight:700 }}>{t('checkout_title')}</div>
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
          <div style={{ display:'flex', justifyContent:'space-between', marginTop:9 }}>
            <div style={{ fontSize:13, color:MUTED }}>{t('delivery_fee')}</div>
            <div style={{ fontSize:13, color:deliveryFee?INK:GREEN, fontWeight:700 }}>{deliveryFee ? priceStr(deliveryFee, city) : t('delivery_free')}</div>
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', marginTop:11 }}>
            <div style={{ fontWeight:700, color:INK }}>{t('total')}</div>
            <div style={{ fontSize:18, fontWeight:800, color:GOLD_D }}>{priceStr(grandTotal, city)}</div>
          </div>
        </div>

        <div style={{ marginBottom:14 }}>
          <label style={S.label}>{t('delivery_type')}</label>
          <div style={{ display:'flex', gap:10 }}>
            {[{v:'delivery',l:t('delivery')},{v:'pickup',l:t('pickup')}].map(opt=>(
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
            <label style={S.label}>{t('address')}</label>
            <input style={S.input} value={address} onChange={e=>setAddress(e.target.value)} placeholder="ул. Рудаки 10, кв. 5"/>
          </div>
        )}
        {deliveryType==='pickup' && (
          <div style={{ background:SAND, borderRadius:12, padding:13, marginBottom:14, fontSize:12, color:GOLD_D, fontWeight:600 }}>
            📍 Забрать можно в магазине Queen Star, Душанбе. Адрес пришлём после подтверждения заказа.
          </div>
        )}

        <div style={{ marginBottom:14 }}>
          <label style={S.label}>{t('payment')}</label>
          <div style={{ display:'flex', gap:10 }}>
            {[{v:'cash',l:t('cash')},{v:'transfer',l:t('transfer')}].map(opt=>(
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
          <label style={S.label}>{t('note')}</label>
          <input style={S.input} value={note} onChange={e=>setNote(e.target.value)} placeholder="Особые пожелания..."/>
        </div>
        {err&&<div style={{ fontSize:13, color:RED, marginBottom:10, textAlign:'center', fontWeight:600 }}>{err}</div>}
      </div>
      <div style={{ position:'fixed', bottom:0, left:0, right:0, padding:16, background:PAPER, borderTop:`1px solid ${LINE}`, zIndex:10 }}>
          <button style={S.btn()} onClick={submit} disabled={loading}>{loading?'Оформляем...':t('confirm_order')}</button>
      </div>
    </div>
  );
}

// ── SUCCESS ───────────────────────────────────────────────────
function SuccessPage({ onClose, orderSummary }) {
  const { t } = useLang();
  return (
    <div className="qs-screen-in" style={{ position:'fixed', inset:0, background:PAPER, zIndex:400, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:24, overflowY:'auto' }}>
      <div style={{ fontSize:64, marginBottom:18 }}>🎉</div>
      <div style={{ fontFamily:"'Playfair Display',serif", fontSize:25, color:INK, fontWeight:700, marginBottom:10, textAlign:'center' }}>{t('order_success')}</div>
      <div style={{ fontSize:14, color:MUTED, textAlign:'center', marginBottom:20, lineHeight:1.8 }}>
        Чтобы мы подтвердили заказ быстрее — отправьте детали нам в WhatsApp одним нажатием
      </div>
      {orderSummary && (
        <a href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(orderSummary)}`} target="_blank"
          style={{ ...S.btn(GREEN), maxWidth:320, width:'100%', marginBottom:14, textDecoration:'none', display:'block', textAlign:'center', boxSizing:'border-box' }}>
          📲 Отправить заказ в WhatsApp
        </a>
      )}
      <div style={{ ...S.card, padding:16, marginBottom:24, width:'100%', maxWidth:320, textAlign:'center' }}>
        <div style={{ fontSize:13, color:MUTED }}>Следи за статусом в</div>
        <div style={{ fontSize:14, fontWeight:700, color:GOLD_D, marginTop:4 }}>👤 Мой аккаунт → История заказов</div>
      </div>
      <button style={{ ...S.btn(GOLD), maxWidth:320, width:'100%' }} onClick={onClose}>{t('back_to_catalog')}</button>
    </div>
  );
}

// ── PRODUCT CARD ──────────────────────────────────────────────
function ProductCard({ product, photo, onAddToCart, isFav, onToggleFav, isHit, onQuickView, onNotify }) {
  const city = useCity();
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
    const msg = encodeURIComponent(`Здравствуйте! Хочу заказать "${product.name}", размер ${size}, цена ${priceStr(product.price, city)}`);
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
          <div style={{ position:'absolute', bottom:9, left:9, background:avail===1?RED:GOLD_D, color:'#fff', borderRadius:7, padding:'4px 9px', fontSize:10, fontWeight:700 }}>
            {avail===1?'🔥 Последняя пара!':`Осталось ${avail} пар!`}
          </div>
        )}
      </div>
      <div style={{ padding:13 }}>
        <div style={{ fontSize:10, color:GOLD_D, letterSpacing:1, marginBottom:3, fontWeight:700 }}>{product.id}</div>
        <div style={{ fontSize:14, fontWeight:700, color:INK, marginBottom:5, lineHeight:1.3 }}>{product.name}</div>
        <div style={{ fontSize:19, fontWeight:800, color:GOLD_D, marginBottom:11 }}>{priceStr(product.price, city)}</div>
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
        {avail<=0 && onNotify && (
          <button style={{ ...S.btnGhost(MUTED), width:'100%', textAlign:'center', padding:'9px', marginBottom:6 }} onClick={()=>onNotify(product)}>
            🔔 Уведомить о наличии
          </button>
        )}
        <button style={{ ...S.btnGhost(GREEN), width:'100%', textAlign:'center', padding:'9px' }} onClick={waOrder}>
          💬 WhatsApp
        </button>
      </div>
      <ReviewsSectionV2 productId={product.id}/>
    </div>
  );
}

// ── CITY SELECTOR ─────────────────────────────────────────────
function CitySelector({ city, setCity, onClose }) {
  return (
    <div className="qs-fade-in" style={{ position:'fixed', inset:0, background:'rgba(35,26,20,0.5)', zIndex:500, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
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
  const city = useCity();
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
      productPrice:product.price, productPhoto:firstPhoto(photos[product.id])||'',
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
                    <div style={{ fontSize:15, fontWeight:800, color:GOLD_D, marginTop:3 }}>{priceStr(msg.productPrice, city)}</div>
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
                {firstPhoto(photos[p.id])?<img src={firstPhoto(photos[p.id])} style={{ width:'100%', height:'100%', objectFit:'cover' }}/>:<div style={{ height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>👞</div>}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:600, color:INK }}>{p.name}</div>
                <div style={{ fontSize:12, color:GOLD_D }}>{priceStr(p.price, city)}</div>
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


// ── КАТЕГОРИИ ─────────────────────────────────────────────────
const CATEGORIES = [
  { id:'all',     icon:'👗', label:'Все товары' },
  { id:'boots',   icon:'👢', label:'Сапоги' },
  { id:'heels',   icon:'👠', label:'Каблуки' },
  { id:'sandals', icon:'🩴', label:'Босоножки' },
  { id:'sneakers',icon:'👟', label:'Кроссовки' },
  { id:'flats',   icon:'👞', label:'Балетки' },
  { id:'slippers',icon:'🥿', label:'Тапочки' },
];

const getCat = (product) => {
  const n = (product.name||'').toLowerCase();
  const id = (product.id||'').toUpperCase();
  if(n.includes('сапог')||n.includes('ботин')||id.startsWith('ЖЗ')) return 'boots';
  if(n.includes('каблук')||n.includes('туфл')||id.startsWith('ЖК')) return 'heels';
  if(n.includes('босоножк')||id.startsWith('ЖБ')) return 'sandals';
  if(n.includes('кроссовк')||id.startsWith('КМ')||id.startsWith('КЖ')) return 'sneakers';
  if(n.includes('балетк')||n.includes('мокас')||id.startsWith('ЖМ')) return 'flats';
  if(n.includes('тапочк')||n.includes('сланц')||id.startsWith('ЖС')||id.startsWith('СЛ')) return 'slippers';
  return 'all';
};

// ── PRICE RANGE SLIDER ────────────────────────────────────────
function PriceFilter({ min, max, value, onChange }) {
  const city = useCity();
  return (
    <div style={{ padding:'12px 14px', background:PAPER, borderRadius:12, border:`1px solid ${LINE}` }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10 }}>
        <span style={{ fontSize:12, color:MUTED, fontWeight:600 }}>Цена</span>
        <span style={{ fontSize:12, color:GOLD_D, fontWeight:700 }}>{priceStr(value[0], city)} — {priceStr(value[1], city)}</span>
      </div>
      <input type="range" min={min} max={max} value={value[0]}
        onChange={e=>onChange([Number(e.target.value), value[1]])}
        style={{ width:'100%', accentColor:GOLD, marginBottom:4 }}/>
      <input type="range" min={min} max={max} value={value[1]}
        onChange={e=>onChange([value[0], Number(e.target.value)])}
        style={{ width:'100%', accentColor:GOLD }}/>
    </div>
  );
}

// ── ORDER TRACKING TIMELINE ───────────────────────────────────
function OrderTimeline({ status }) {
  const steps = [
    { key:'new',      label:'Принят',        icon:'✓' },
    { key:'delivery', label:'В доставке',     icon:'🚚' },
    { key:'done',     label:'Доставлен',      icon:'📦' },
  ];
  const statusOrder = { new:0, delivery:1, done:2, cancelled:-1 };
  const current = statusOrder[status] ?? 0;

  if(status==='cancelled') return (
    <div style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 14px', background:RED+'12', borderRadius:10, border:`1px solid ${RED}33` }}>
      <div style={{ fontSize:16 }}>✕</div>
      <div style={{ fontSize:13, fontWeight:700, color:RED }}>Заказ отменён</div>
    </div>
  );

  return (
    <div style={{ display:'flex', alignItems:'center', gap:0, marginTop:6 }}>
      {steps.map((step,i)=>{
        const done = current >= i;
        const active = current === i;
        return (
          <div key={step.key} style={{ display:'flex', alignItems:'center', flex:1 }}>
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center' }}>
              <div style={{ width:28, height:28, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12,
                background:done?GOLD:LINE, color:done?'#fff':MUTED, fontWeight:700,
                boxShadow:active?`0 0 0 3px ${GOLD}44`:undefined }}>
                {step.icon}
              </div>
              <div style={{ fontSize:9, fontWeight:active?700:500, color:done?GOLD_D:MUTED, marginTop:4, textAlign:'center', lineHeight:1.2 }}>
                {step.label}
              </div>
            </div>
            {i<steps.length-1 && (
              <div style={{ flex:1, height:2, background:current>i?GOLD:LINE, margin:'0 4px', marginBottom:16 }}/>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── SELLER REPLY TO REVIEW ────────────────────────────────────
// (Used in management app side - shop just shows replies)
function ReviewWithReply({ review }) {
  return (
    <div style={{ background:BG, borderRadius:10, padding:11, marginTop:8 }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
        <div style={{ fontSize:12, fontWeight:700, color:INK }}>{review.customerName}</div>
        <div style={{ fontSize:11, color:GOLD }}>{'★'.repeat(review.rating)}{'☆'.repeat(5-review.rating)}</div>
      </div>
      {review.text && <div style={{ fontSize:12, color:MUTED, lineHeight:1.5 }}>{review.text}</div>}
      {review.reply && (
        <div style={{ marginTop:8, padding:'8px 10px', background:GOLD+'12', borderRadius:8, borderLeft:`3px solid ${GOLD}` }}>
          <div style={{ fontSize:10, fontWeight:700, color:GOLD_D, marginBottom:3 }}>💬 Ответ продавца</div>
          <div style={{ fontSize:12, color:INK }}>{review.reply}</div>
        </div>
      )}
    </div>
  );
}

// ── ENHANCED REVIEWS SECTION ──────────────────────────────────
function ReviewsSectionV2({ productId }) {
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
  const dist = [5,4,3,2,1].map(n=>({n, count:reviews.filter(r=>r.rating===n).length}));

  return (
    <div style={{ padding:'12px 16px', borderTop:`1px solid ${LINE}` }}>
      {avg ? (
        <div style={{ display:'flex', gap:14, alignItems:'center', marginBottom:8 }}>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:32, fontWeight:800, color:INK }}>{avg}</div>
            <div style={{ color:GOLD, fontSize:14 }}>{'★'.repeat(Math.round(Number(avg)))}</div>
            <div style={{ fontSize:11, color:MUTED }}>{reviews.length} отзывов</div>
          </div>
          <div style={{ flex:1 }}>
            {dist.map(d=>(
              <div key={d.n} style={{ display:'flex', alignItems:'center', gap:6, marginBottom:3 }}>
                <div style={{ fontSize:11, color:MUTED, width:8 }}>{d.n}</div>
                <div style={{ flex:1, height:6, background:LINE, borderRadius:3, overflow:'hidden' }}>
                  <div style={{ height:'100%', width:`${reviews.length?d.count/reviews.length*100:0}%`, background:GOLD, borderRadius:3 }}/>
                </div>
                <div style={{ fontSize:11, color:MUTED, width:16 }}>{d.count}</div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ fontSize:12, color:MUTED, marginBottom:8 }}>Отзывов пока нет</div>
      )}
      {reviews.length>0 && (
        <button style={{ background:'none', border:'none', fontSize:12, color:GOLD_D, cursor:'pointer', fontWeight:700, padding:0 }}
          onClick={()=>setShow(!show)}>{show?'Скрыть отзывы':'Читать отзывы'}</button>
      )}
      {show && reviews.slice(0,5).map(r=><ReviewWithReply key={r.id} review={r}/>)}
    </div>
  );
}


// ── QUICK VIEW MODAL ──────────────────────────────────────────
function QuickView({ product, photo, onAddToCart, onClose, isFav, onToggleFav }) {
  const city = useCity();
  const [size, setSize] = useState('');
  const [added, setAdded] = useState(false);
  const SIZES = ['36','37','38','39','40','41','42'];
  const avail = product.qty - (product.reserved||0);

  const add = () => {
    if(!size) return;
    onAddToCart({...product, photo, size, qty:1, total:product.price});
    setAdded(true);
    setTimeout(()=>{setAdded(false); onClose();}, 1000);
  };

  return (
    <div className="qs-fade-in" style={{ position:'fixed', inset:0, background:'rgba(35,26,20,0.55)', zIndex:300, display:'flex', alignItems:'flex-end', justifyContent:'center' }}
      onClick={onClose}>
      <div className="qs-sheet-in" style={{ background:PAPER, borderRadius:'22px 22px 0 0', padding:20, width:'100%', maxWidth:480, maxHeight:'85vh', overflowY:'auto' }}
        onClick={e=>e.stopPropagation()}>
        <div style={{ width:36, height:4, background:LINE, borderRadius:2, margin:'0 auto 16px' }}/>
        <div style={{ display:'flex', gap:14, marginBottom:16 }}>
          <div style={{ width:100, height:100, borderRadius:14, background:BG, overflow:'hidden', flexShrink:0 }}>
            {photo ? <img src={photo} style={{ width:'100%', height:'100%', objectFit:'cover' }}/> : <div style={{ height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:36 }}>👞</div>}
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:11, color:GOLD_D, fontWeight:700, marginBottom:4 }}>{product.id}</div>
            <div style={{ fontSize:16, fontWeight:700, color:INK, marginBottom:6 }}>{product.name}</div>
            <div style={{ fontSize:22, fontWeight:800, color:GOLD_D }}>{priceStr(product.price, city)}</div>
            <div style={{ fontSize:12, color:avail>5?GREEN:RED, marginTop:4, fontWeight:600 }}>
              {avail>5?'✓ В наличии':`Осталось ${avail} пар`}
            </div>
          </div>
          <button onClick={()=>onToggleFav(product.id)} style={{ background:'none', border:'none', fontSize:22, cursor:'pointer', alignSelf:'flex-start' }}>
            {isFav?'❤️':'🤍'}
          </button>
        </div>
        <div style={{ marginBottom:14 }}>
          <div style={{ fontSize:12, color:MUTED, fontWeight:700, marginBottom:8 }}>Размер:</div>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            {SIZES.map(s=>(
              <div key={s} onClick={()=>setSize(s)}
                style={{ padding:'8px 12px', borderRadius:9, cursor:'pointer', fontSize:14, fontWeight:700,
                  background:size===s?GOLD:BG, color:size===s?'#fff':INK, border:`1.5px solid ${size===s?GOLD:LINE}` }}>
                {s}
              </div>
            ))}
          </div>
          {!size && <div style={{ fontSize:11, color:MUTED, marginTop:6 }}>Выбери размер перед добавлением</div>}
        </div>
        <button style={{ ...S.btn(added?GREEN:size?GOLD:MUTED), marginBottom:8 }} onClick={add}>
          {added?'✓ Добавлено!':`🛍 В корзину${!size?' (выбери размер)':''}`}
        </button>
        <button style={{ ...S.btn(INK), opacity:0.7 }} onClick={onClose}>Закрыть</button>
      </div>
    </div>
  );
}

// ── NOTIFY WHEN AVAILABLE ─────────────────────────────────────
function NotifyModal({ product, onClose }) {
  const [phone, setPhone] = useState('+992');
  const [sent, setSent]   = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if(phone.length < 10) return;
    setLoading(true);
    try {
      await addDoc(collection(db,'notify_requests'),{
        productId:product.id, productName:product.name,
        phone:phone.trim(), date:nowStr()
      });
      setSent(true);
    } catch {}
    setLoading(false);
  };

  if(sent) return (
    <div className="qs-fade-in" style={{ position:'fixed', inset:0, background:'rgba(35,26,20,0.5)', zIndex:400, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ background:PAPER, borderRadius:20, padding:24, maxWidth:320, width:'100%', textAlign:'center' }}>
        <div style={{ fontSize:44, marginBottom:12 }}>🔔</div>
        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:18, color:INK, fontWeight:700, marginBottom:8 }}>Готово!</div>
        <div style={{ fontSize:13, color:MUTED, marginBottom:16 }}>Сообщим когда товар появится</div>
        <button style={S.btn()} onClick={onClose}>Закрыть</button>
      </div>
    </div>
  );

  return (
    <div className="qs-fade-in" style={{ position:'fixed', inset:0, background:'rgba(35,26,20,0.5)', zIndex:400, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ background:PAPER, borderRadius:20, padding:24, maxWidth:320, width:'100%' }}>
        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:17, color:INK, fontWeight:700, marginBottom:8 }}>🔔 Уведомить о наличии</div>
        <div style={{ fontSize:13, color:MUTED, marginBottom:16 }}>{product.name}</div>
        <label style={S.label}>Номер телефона</label>
        <input style={{ ...S.input, marginBottom:14 }} value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+992 900 000000" type="tel"/>
        <button style={{ ...S.btn(GOLD), marginBottom:8 }} onClick={submit} disabled={loading}>{loading?'...':'Уведомить меня'}</button>
        <button style={{ ...S.btn(INK), opacity:0.6 }} onClick={onClose}>Отмена</button>
      </div>
    </div>
  );
}

// ── LOYALTY POINTS ────────────────────────────────────────────
function LoyaltyCard({ customer }) {
  const [liveData, setLiveData] = useState(customer);
  useEffect(()=>{
    const phoneId = (customer.phone||'').replace(/\D/g,'') || customer.id;
    const unsub = onSnapshot(doc(db,'shop_customers', phoneId), snap=>{
      if(snap.exists()) setLiveData(snap.data());
    });
    return()=>unsub();
  },[customer.id]);
  const points = liveData.loyaltyPoints || 0;
  const discount = points; // 1 point = 1 som cashback
  const nextLevel = Math.ceil((points+1) / 10) * 10;
  const progress = Math.min((points % 10) / 10 * 100, 100);

  return (
    <div style={{ ...S.card, padding:16, marginBottom:14, background:`linear-gradient(135deg,${INK},#3A2C20)`, color:'#fff', border:'none' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
        <div>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:16, color:GOLD_L }}>Queen Star</div>
          <div style={{ fontSize:11, opacity:0.7, marginTop:2 }}>Карта лояльности</div>
        </div>
        <div style={{ fontSize:26 }}>💳</div>
      </div>
      <div style={{ fontSize:32, fontWeight:800, color:GOLD_L, marginBottom:4 }}>{points} <span style={{ fontSize:14, fontWeight:400 }}>баллов</span></div>
      <div style={{ height:6, background:'rgba(255,255,255,0.15)', borderRadius:3, marginBottom:8, overflow:'hidden' }}>
        <div style={{ height:'100%', width:`${progress}%`, background:GOLD, borderRadius:3 }}/>
      </div>
      <div style={{ fontSize:11, opacity:0.7 }}>До следующей награды: {nextLevel - points} баллов</div>
      <div style={{ marginTop:8, background:GOLD+'33', borderRadius:8, padding:'6px 10px', fontSize:12, color:GOLD_L, fontWeight:700 }}>
        {points>0?`🎁 Накопленный кешбек: ${points} сом`:'За каждую покупку +5 сом кешбек'}
      </div>
    </div>
  );
}

// ── VIEW COUNTER ──────────────────────────────────────────────
function useViewCount(productId) {
  const [count, setCount] = useState(0);
  useEffect(()=>{
    if(!productId) return;
    // Increment view count in Firebase
    const key = 'views_' + productId;
    getDoc(doc(db,'product_stats',productId)).then(snap=>{
      const views = snap.exists() ? (snap.data().views||0) : 0;
      setCount(views);
      // Increment (fire and forget)
      setDoc(doc(db,'product_stats',productId),{views:views+1},{merge:true}).catch(()=>{});
    }).catch(()=>{});
  },[productId]);
  return count;
}


// ── PRODUCT PAGE ──────────────────────────────────────────────
function ProductPage({ product, photos, onAddToCart, isFav, onToggleFav, onClose, allProducts, addToast, onView }) {
  const city = useCity();
  const [size, setSize]       = useState('');
  const [added, setAdded]     = useState(false);
  const [activePhoto, setActivePhoto] = useState(0);
  const [showGuide, setShowGuide]     = useState(false);
  const SIZES = ['36','37','38','39','40','41','42'];
  const avail  = product.qty - (product.reserved||0);
  const similar = allProducts.filter(p=>p.id!==product.id && getCat(p)===getCat(product)).slice(0,4);

  // Multiple photos: Firebase photos object may have array or single string
  const rawPhoto = photos[product.id];
  const photoList = Array.isArray(rawPhoto) ? rawPhoto : rawPhoto ? [rawPhoto] : [];

  const add = () => {
    if(!size) return;
    onAddToCart({...product, photo:photoList[0]||'', size, qty:1, total:product.price});
    setAdded(true);
    addToast('🛍 Добавлено в корзину');
    setTimeout(()=>setAdded(false), 1500);
  };

  const share = () => {
    const url = `${window.location.origin}?product=${product.id}`;
    const text = `${product.name} — ${priceStr(product.price, city)}\n${url}`;
    if(navigator.share) navigator.share({title:product.name, text}).catch(()=>{});
    else { navigator.clipboard.writeText(url).catch(()=>{}); addToast('🔗 Ссылка скопирована'); }
  };

  // Update URL for SEO
  useEffect(()=>{
    const url = new URL(window.location);
    url.searchParams.set('product', product.id);
    window.history.pushState({}, '', url);
    document.title = `${product.name} — Queen Star`;
    return () => {
      const url2 = new URL(window.location);
      url2.searchParams.delete('product');
      window.history.pushState({}, '', url2);
      document.title = 'Queen Star — Женская обувь Душанбе';
    };
  },[product.id]);

  return (
    <div className="qs-screen-in" style={{ position:'fixed', inset:0, background:BG, zIndex:200, overflowY:'auto' }}>
      {showGuide && <SizeGuideModal onClose={()=>setShowGuide(false)}/>}
      <div style={{ maxWidth:480, margin:'0 auto', paddingBottom:120 }}>
        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'14px 16px', position:'sticky', top:0, background:BG, zIndex:10 }}>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:22, cursor:'pointer', color:INK }}>←</button>
          <div style={{ display:'flex', gap:10 }}>
            <button onClick={share} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer', color:MUTED }}>🔗</button>
            <button onClick={()=>onToggleFav(product.id)} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer' }}>{isFav?'❤️':'🤍'}</button>
          </div>
        </div>

        {/* Photo gallery */}
        <div style={{ background:SAND, position:'relative', overflow:'hidden' }}>
          <div style={{ height:240, background:SAND }}>
            {photoList.length>0 ? (
              <ZoomableImage src={photoList[activePhoto]} alt={product.name} style={{ width:'100%', height:'100%', objectFit:'contain' }}/>
            ) : (
              <div style={{ height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:72 }}>👞</div>
            )}
          </div>
          {photoList.length>1 && (
            <div style={{ display:'flex', gap:6, padding:'8px 14px', overflowX:'auto' }}>
              {photoList.map((ph,i)=>(
                <div key={i} onClick={()=>setActivePhoto(i)}
                  style={{ width:56, height:56, borderRadius:8, overflow:'hidden', flexShrink:0, border:`2px solid ${i===activePhoto?GOLD:LINE}`, cursor:'pointer' }}>
                  <img src={ph} style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div style={{ padding:'16px 16px 0' }}>
          <div style={{ fontSize:11, color:GOLD_D, fontWeight:700, marginBottom:4 }}>{product.id}</div>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:22, fontWeight:700, color:INK, marginBottom:6, lineHeight:1.2 }}>{product.name}</div>
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:14 }}>
            <div style={{ fontSize:28, fontWeight:800, color:GOLD_D }}>{priceStr(product.price, city)}</div>
            <div style={{ fontSize:13, fontWeight:700, color:avail>5?GREEN:avail>0?GOLD_D:RED }}>
              {avail>5?'✓ В наличии':avail>0?`Осталось ${avail} пар`:'Нет в наличии'}
            </div>
          </div>

          {/* Size selector */}
          {avail>0 && (
            <div style={{ marginBottom:16 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                <div style={{ fontSize:13, fontWeight:700, color:INK }}>Размер {size && `— ${size}`}</div>
                <button style={{ background:'none', border:'none', fontSize:12, color:BLUE, cursor:'pointer', fontWeight:600 }} onClick={()=>setShowGuide(true)}>📏 Таблица размеров</button>
              </div>
              <div style={{ display:'flex', gap:7, flexWrap:'wrap' }}>
                {SIZES.map(s=>(
                  <div key={s} onClick={()=>setSize(s)}
                    style={{ padding:'10px 14px', borderRadius:10, cursor:'pointer', fontSize:15, fontWeight:700,
                      background:size===s?GOLD:PAPER, color:size===s?'#fff':INK,
                      border:`1.5px solid ${size===s?GOLD:LINE}` }}>
                    {s}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reviews */}
          <ReviewsSectionV2 productId={product.id}/>

          {/* Similar products */}
          {similar.length>0 && (
            <div style={{ marginTop:16 }}>
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:16, fontWeight:700, color:INK, marginBottom:12 }}>Похожие товары</div>
              <div style={{ display:'flex', gap:10, overflowX:'auto', paddingBottom:6 }}>
                {similar.map(p=>(
                  <div key={p.id} style={{ minWidth:140, ...S.card, cursor:'pointer' }} onClick={()=>onView(p)}>
                    <div style={{ height:110, background:BG, overflow:'hidden' }}>
                      {firstPhoto(photos[p.id])?<img src={firstPhoto(photos[p.id])} style={{ width:'100%', height:'100%', objectFit:'cover' }}/>:
                       <div style={{ height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:28 }}>👞</div>}
                    </div>
                    <div style={{ padding:9 }}>
                      <div style={{ fontSize:12, fontWeight:700, color:INK, lineHeight:1.3, marginBottom:4 }}>{p.name}</div>
                      <div style={{ fontSize:14, fontWeight:800, color:GOLD_D }}>{priceStr(p.price, city)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Customer photos section */}
          <CustomerPhotos productId={product.id} customer={null}/>
        </div>
      </div>

      {/* Fixed bottom buttons */}
      {avail>0 && (
        <div style={{ position:'fixed', bottom:0, left:0, right:0, padding:16, background:PAPER, borderTop:`1px solid ${LINE}`, zIndex:10 }}>
          <div style={{ maxWidth:480, margin:'0 auto', display:'flex', gap:10 }}>
            <a href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent('Хочу заказать: '+product.name+' р.'+size)}`}
              target="_blank" style={{ ...S.btnGhost(GREEN), display:'flex', alignItems:'center', justifyContent:'center', textDecoration:'none', padding:'14px', flexShrink:0 }}>
              💬
            </a>
            <button style={{ ...S.btn(added?GREEN:size?GOLD:MUTED), flex:1 }} onClick={add}>
              {added?'✓ Добавлено!':size?'🛍 В корзину':'Выбери размер'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── CUSTOMER PHOTOS ───────────────────────────────────────────
function CustomerPhotos({ productId, customer }) {
  const [photos2, setPhotos2] = useState([]);
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading]   = useState(false);

  useEffect(()=>{
    if(!productId) return;
    const q = query(collection(db,'customer_photos'), where('productId','==',productId));
    const unsub = onSnapshot(q, snap=>{
      setPhotos2(snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>new Date(b.date)-new Date(a.date)));
    });
    return()=>unsub();
  },[productId]);

  const upload = async (e) => {
    const file = e.target.files?.[0];
    if(!file || !customer) return;
    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        await addDoc(collection(db,'customer_photos'),{
          productId, customerId:customer.id, customerName:customer.name,
          photo:ev.target.result, date:nowStr()
        });
        setShowUpload(false);
      };
      reader.readAsDataURL(file);
    } catch {}
    setUploading(false);
  };

  if(photos2.length===0 && !customer) return null;

  return (
    <div style={{ marginTop:16 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:15, fontWeight:700, color:INK }}>📸 Фото покупателей</div>
        {customer && <button style={{ ...S.btnGhost(GOLD), fontSize:11, padding:'6px 10px' }} onClick={()=>setShowUpload(true)}>+ Добавить фото</button>}
      </div>
      {photos2.length===0 && <div style={{ fontSize:12, color:MUTED }}>Будь первым, кто добавит фото!</div>}
      <div style={{ display:'flex', gap:8, overflowX:'auto', paddingBottom:4 }}>
        {photos2.map(p=>(
          <div key={p.id} style={{ flexShrink:0 }}>
            <div style={{ width:88, height:88, borderRadius:12, overflow:'hidden', border:`1px solid ${LINE}` }}>
              <img src={p.photo} style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
            </div>
            <div style={{ fontSize:10, color:MUTED, textAlign:'center', marginTop:3 }}>{p.customerName}</div>
          </div>
        ))}
      </div>
      {showUpload && (
        <div style={{ marginTop:10 }}>
          <input type="file" accept="image/*" onChange={upload} style={{ fontSize:13 }}/>
          {uploading && <div style={{ fontSize:12, color:MUTED }}>Загружаем...</div>}
        </div>
      )}
    </div>
  );
}

// ── RECENTLY VIEWED ───────────────────────────────────────────
function RecentlyViewed({ productIds, allProducts, photos, onView }) {
  const city = useCity();
  const recent = productIds.map(id=>allProducts.find(p=>p.id===id)).filter(Boolean).slice(0,5);
  if(!recent.length) return null;
  return (
    <div style={{ marginTop:20 }}>
      <div style={{ fontFamily:"'Playfair Display',serif", fontSize:16, fontWeight:700, color:INK, marginBottom:10, padding:'0 2px' }}>🕐 Вы недавно смотрели</div>
      <div style={{ display:'flex', gap:10, overflowX:'auto', paddingBottom:4 }}>
        {recent.map(p=>{
          const ph = photos[p.id];
          const src = Array.isArray(ph)?ph[0]:ph;
          return (
            <div key={p.id} style={{ minWidth:120, ...S.card, cursor:'pointer' }} onClick={()=>onView(p)}>
              <div style={{ height:90, background:BG }}>
                {src?<img src={src} style={{ width:'100%', height:'100%', objectFit:'cover' }}/>:<div style={{ height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:26 }}>👞</div>}
              </div>
              <div style={{ padding:'8px 9px' }}>
                <div style={{ fontSize:12, fontWeight:700, color:INK, lineHeight:1.3 }}>{p.name}</div>
                <div style={{ fontSize:13, fontWeight:800, color:GOLD_D, marginTop:3 }}>{priceStr(p.price, city)}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


// ── ONLINE CONSULTANT CHAT ────────────────────────────────────
function ConsultantChat({ onClose }) {
  const [messages, setMessages] = useState([
    { id:1, from:'admin', text:'Здравствуйте! Я помогу вам выбрать обувь. Задайте любой вопрос 👠', time:nowStr() }
  ]);
  const [text, setText] = useState('');
  const [name, setName] = useState('');
  const [started, setStarted] = useState(false);
  const bottomRef = useRef(null);

  useEffect(()=>{
    const unsub = onSnapshot(
      query(collection(db,'consultant_chat'), orderBy('time','asc')),
      snap => {
        const msgs = snap.docs.map(d=>({id:d.id,...d.data()}));
        if(msgs.length) setMessages(msgs);
        setTimeout(()=>bottomRef.current?.scrollIntoView({behavior:'smooth'}),100);
      }
    );
    return()=>unsub();
  },[]);

  const send = async () => {
    if(!text.trim()) return;
    await addDoc(collection(db,'consultant_chat'),{
      from:'customer', name:name||'Покупатель',
      text:text.trim(), time:nowStr(), read:false
    });
    setText('');
  };

  if(!started) return (
    <div className="qs-fade-in" style={{ position:'fixed', inset:0, background:'rgba(35,26,20,0.5)', zIndex:400, display:'flex', alignItems:'flex-end', justifyContent:'center' }}>
      <div className="qs-sheet-in" style={{ background:PAPER, borderRadius:'22px 22px 0 0', padding:24, width:'100%', maxWidth:480 }}>
        <div style={{ width:36, height:4, background:LINE, borderRadius:2, margin:'0 auto 16px' }}/>
        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:18, fontWeight:700, color:INK, marginBottom:6 }}>💬 Онлайн-консультант</div>
        <div style={{ fontSize:13, color:MUTED, marginBottom:16 }}>Как вас зовут? (необязательно)</div>
        <input style={{ ...S.input, marginBottom:14 }} value={name} onChange={e=>setName(e.target.value)} placeholder="Ваше имя..."/>
        <button style={S.btn()} onClick={()=>setStarted(true)}>Начать чат</button>
        <button style={{ ...S.btn(INK), opacity:0.6, marginTop:8 }} onClick={onClose}>Закрыть</button>
      </div>
    </div>
  );

  return (
    <div style={{ position:'fixed', inset:0, background:BG, zIndex:400, display:'flex', flexDirection:'column' }}>
      <div style={{ background:PAPER, borderBottom:`1px solid ${LINE}`, padding:'13px 16px', display:'flex', alignItems:'center', gap:12 }}>
        <button onClick={onClose} style={{ background:'none', border:'none', fontSize:22, cursor:'pointer', color:INK }}>←</button>
        <div style={{ width:38, height:38, borderRadius:'50%', background:`linear-gradient(135deg,${GOLD},${GOLD_D})`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>👩</div>
        <div>
          <div style={{ fontSize:14, fontWeight:700, color:INK }}>Консультант Queen Star</div>
          <div style={{ fontSize:11, color:GREEN, fontWeight:600 }}>● Онлайн</div>
        </div>
      </div>
      <div style={{ flex:1, overflowY:'auto', padding:14, display:'flex', flexDirection:'column', gap:10 }}>
        {messages.map(m=>(
          <div key={m.id} style={{ display:'flex', justifyContent:m.from==='admin'?'flex-start':'flex-end' }}>
            <div style={{ maxWidth:'80%', background:m.from==='admin'?PAPER:GOLD, color:m.from==='admin'?INK:'#fff',
              borderRadius:m.from==='admin'?'4px 14px 14px 14px':'14px 4px 14px 14px',
              padding:'10px 13px', fontSize:13, boxShadow:'0 1px 4px rgba(0,0,0,0.08)' }}>
              {m.text}
            </div>
          </div>
        ))}
        <div ref={bottomRef}/>
      </div>
      <div style={{ background:PAPER, borderTop:`1px solid ${LINE}`, padding:'10px 14px', display:'flex', gap:8 }}>
        <input style={{ ...S.input, flex:1, padding:'10px 12px' }} value={text}
          onChange={e=>setText(e.target.value)}
          onKeyDown={e=>{if(e.key==='Enter')send();}}
          placeholder="Написать..."/>
        <button style={{ ...S.btn(GOLD), width:'auto', padding:'10px 16px' }} onClick={send}>→</button>
      </div>
    </div>
  );
}

// ── OUTFIT BUILDER ────────────────────────────────────────────
function OutfitBuilder({ products, photos, onAddToCart }) {
  const OCCASIONS = [
    {id:'work',    label:'На работу',  icon:'💼', colors:['#2C3E50','#8E44AD','#2980B9']},
    {id:'casual',  label:'Повседневный',icon:'👜', colors:['#E67E22','#27AE60','#95A5A6']},
    {id:'evening', label:'На вечер',   icon:'✨', colors:['#C0392B','#2C3E50','#F39C12']},
    {id:'sport',   label:'Спортивный', icon:'🏃', colors:['#27AE60','#2980B9','#E74C3C']},
  ];
  const city = useCity();
  const [occasion, setOccasion] = useState('');
  const [recs, setRecs]         = useState([]);

  const generate = (occ) => {
    setOccasion(occ);
    const cats = {
      work:['heels','flats','boots'],
      casual:['flats','sneakers','sandals'],
      evening:['heels','boots'],
      sport:['sneakers','flats'],
    };
    const allowed = cats[occ]||[];
    const matched = products.filter(p=>!p.transit&&(p.qty-(p.reserved||0))>0&&allowed.includes(getCat(p)));
    // Pick up to 3 random products
    const shuffled = [...matched].sort(()=>Math.random()-0.5);
    setRecs(shuffled.slice(0,3));
  };

  return (
    <div style={{ ...S.card, padding:16, marginTop:14 }}>
      <div style={{ fontFamily:"'Playfair Display',serif", fontSize:16, fontWeight:700, color:INK, marginBottom:12 }}>👗 Конструктор образа</div>
      <div style={{ fontSize:13, color:MUTED, marginBottom:12 }}>Выбери повод — подберём обувь:</div>
      <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:14 }}>
        {OCCASIONS.map(o=>(
          <button key={o.id} onClick={()=>generate(o.id)}
            style={{ ...S.chip(occasion===o.id), fontSize:13 }}>
            {o.icon} {o.label}
          </button>
        ))}
      </div>
      {recs.length>0 && (
        <>
          <div style={{ fontSize:12, color:MUTED, marginBottom:10, fontWeight:600 }}>Рекомендуем для образа:</div>
          <div style={{ display:'flex', gap:10, overflowX:'auto' }}>
            {recs.map(p=>{
              const ph = photos[p.id];
              const src = Array.isArray(ph)?ph[0]:ph;
              return (
                <div key={p.id} style={{ minWidth:130, ...S.card }}>
                  <div style={{ height:100, background:BG }}>
                    {src?<img src={src} style={{ width:'100%', height:'100%', objectFit:'contain' }}/>:<div style={{ height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:28 }}>👞</div>}
                  </div>
                  <div style={{ padding:9 }}>
                    <div style={{ fontSize:12, fontWeight:700, color:INK }}>{p.name}</div>
                    <div style={{ fontSize:13, fontWeight:800, color:GOLD_D, marginTop:2 }}>{priceStr(p.price, city)}</div>
                    <button style={{ ...S.btn(GOLD), padding:'7px', fontSize:11, marginTop:6 }}
                      onClick={()=>onAddToCart({...p,photo:src||'',size:'',qty:1,total:p.price})}>
                      В корзину
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
      {recs.length===0 && occasion && (
        <div style={{ fontSize:13, color:MUTED, textAlign:'center', padding:'16px 0' }}>Нет подходящих товаров в наличии</div>
      )}
    </div>
  );
}

// ── STORE MAP ─────────────────────────────────────────────────
function StoreMap() {
  return (
    <div style={{ ...S.card, padding:16, marginTop:14 }}>
      <div style={{ fontFamily:"'Playfair Display',serif", fontSize:16, fontWeight:700, color:INK, marginBottom:10 }}>📍 Как нас найти</div>
      <div style={{ background:SAND, borderRadius:12, padding:14, marginBottom:12 }}>
        <div style={{ fontSize:13, fontWeight:700, color:INK, marginBottom:4 }}>Queen Star</div>
        <div style={{ fontSize:12, color:MUTED, lineHeight:1.7 }}>
          📍 Душанбе, район Фирдавси<br/>
          🕐 Пн–Сб: 09:00–21:00 · Вс: 10:00–19:00<br/>
          📞 +992 87 698 24 24
        </div>
      </div>
      <a href="https://yandex.ru/maps/?text=Душанбе+обувь+Queen+Star" target="_blank"
        style={{ ...S.btn(BLUE), display:'block', textDecoration:'none', textAlign:'center' }}>
        🗺 Открыть на карте
      </a>
    </div>
  );
}


// ── DARK THEME ────────────────────────────────────────────────
// Applied via CSS class on body

// ── PHOTO ZOOM ────────────────────────────────────────────────
function ZoomableImage({ src, alt, style }) {
  const [scale, setScale]   = useState(1);
  const [origin, setOrigin] = useState('50% 50%');
  const lastTap = useRef(0);
  const lastDist = useRef(0);

  const onTouchStart = (e) => {
    if(e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastDist.current = Math.sqrt(dx*dx + dy*dy);
    }
  };

  const onTouchMove = (e) => {
    if(e.touches.length === 2) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx*dx + dy*dy);
      const ratio = dist / (lastDist.current || dist);
      setScale(s => Math.min(Math.max(s * ratio, 1), 3));
      lastDist.current = dist;
      const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      const rect = e.currentTarget.getBoundingClientRect();
      setOrigin(`${((cx-rect.left)/rect.width*100).toFixed(0)}% ${((cy-rect.top)/rect.height*100).toFixed(0)}%`);
    }
  };

  const onTouchEnd = (e) => {
    if(e.touches.length < 2) lastDist.current = 0;
    const now = Date.now();
    if(now - lastTap.current < 300) { setScale(s => s > 1 ? 1 : 2); }
    lastTap.current = now;
    if(scale <= 1) setScale(1);
  };

  return (
    <div style={{ overflow:'hidden', ...style }} onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
      <img src={src} alt={alt||''} style={{ width:'100%', height:'100%', objectFit:'contain', background:SAND, transform:`scale(${scale})`, transformOrigin:origin, transition:scale===1?'transform 0.2s':'none', userSelect:'none' }}/>
    </div>
  );
}

// ── ANALYTICS TRACKER ─────────────────────────────────────────
// Forwards to Google Analytics / Meta Pixel if the site owner configured real
// IDs in index.html — no-ops silently otherwise, so this is safe either way.
const adEvent = (gaName, fbName, params={}) => {
  try { if(typeof window.gtag==='function') window.gtag('event', gaName, params); } catch {}
  try { if(typeof window.fbq==='function') window.fbq('track', fbName, params); } catch {}
};

const Analytics = {
  track: (event, data={}) => {
    try {
      addDoc(collection(db,'analytics'),{
        event, ...data,
        ts: Date.now(),
        date: nowStr(),
        ua: navigator.userAgent.includes('Mobile') ? 'mobile' : 'desktop',
      }).catch(()=>{});
    } catch {}
  },
  pageView: ()   => Analytics.track('page_view'),
  productView: (id, name) => { Analytics.track('product_view',{productId:id, productName:name}); adEvent('view_item','ViewContent',{item_id:id, item_name:name}); },
  addToCart: (id, name, price) => { Analytics.track('add_to_cart',{productId:id, productName:name, price}); adEvent('add_to_cart','AddToCart',{item_id:id, item_name:name, value:price, currency:'TJS'}); },
  checkout: (total) => { Analytics.track('checkout_start',{total}); adEvent('begin_checkout','InitiateCheckout',{value:total, currency:'TJS'}); },
  order: (total) => { Analytics.track('order_placed',{total}); adEvent('purchase','Purchase',{value:total, currency:'TJS'}); },
};

// ── PUSH NOTIFICATIONS ────────────────────────────────────────
// ⚙️ Get this from Firebase Console → Project settings → Cloud Messaging →
// Web Push certificates (generate a key pair if none exists yet).
const VAPID_KEY = 'REPLACE_WITH_YOUR_VAPID_KEY';

// Requests permission, registers an FCM token, and links it to the logged-in
// customer's Firestore doc so the orderStatusPush Cloud Function (see
// functions/index.js) can notify them when their order status changes.
async function enablePush(customer, addToast) {
  if (!messaging) { addToast('❌ Уведомления не поддерживаются в этом браузере'); return false; }
  try {
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') { addToast('❌ Доступ к уведомлениям запрещён'); return false; }
    const token = await getToken(messaging, { vapidKey: VAPID_KEY });
    if (!token) { addToast('❌ Не удалось получить токен уведомлений'); return false; }
    if (customer) {
      const phoneId = customer.phone.replace(/\D/g,'');
      await setDoc(doc(db,'shop_customers',phoneId), { fcmTokens: arrayUnion(token) }, { merge:true });
    }
    addToast('🔔 Уведомления включены!');
    return true;
  } catch {
    addToast('❌ Не удалось включить уведомления — проверьте VAPID_KEY и что функции задеплоены');
    return false;
  }
}

// ── CLICK / PAYME PAYMENT ─────────────────────────────────────
function PaymentModal({ total, orderId, onClose, onPaid }) {
  const CLICK_MERCHANT = 'YOUR_CLICK_MERCHANT_ID'; // замени на свой ID
  const PAYME_MERCHANT = 'YOUR_PAYME_MERCHANT_ID'; // замени на свой ID

  const openClick = () => {
    const url = `https://my.click.uz/services/pay?service_id=${CLICK_MERCHANT}&merchant_id=${CLICK_MERCHANT}&amount=${total}&transaction_param=${orderId}`;
    window.open(url, '_blank');
    setTimeout(()=>{ onPaid('click'); onClose(); }, 1000);
  };

  const openPayme = () => {
    const url = `https://payme.uz/checkout/${PAYME_MERCHANT}?amount=${total * 100}&currency=860&lang=ru`;
    window.open(url, '_blank');
    setTimeout(()=>{ onPaid('payme'); onClose(); }, 1000);
  };

  return (
    <div className="qs-fade-in" style={{ position:'fixed', inset:0, background:'rgba(35,26,20,0.5)', zIndex:500, display:'flex', alignItems:'flex-end', justifyContent:'center' }}>
      <div className="qs-sheet-in" style={{ background:PAPER, borderRadius:'22px 22px 0 0', padding:24, width:'100%', maxWidth:480 }}>
        <div style={{ width:36, height:4, background:LINE, borderRadius:2, margin:'0 auto 18px' }}/>
        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:18, fontWeight:700, color:INK, marginBottom:6 }}>💳 Оплата онлайн</div>
        <div style={{ fontSize:14, color:MUTED, marginBottom:18 }}>Сумма к оплате: <strong style={{color:GOLD_D}}>{fmt(total)} сом</strong></div>

        <button onClick={openClick}
          style={{ ...S.btn('#00B9F2'), marginBottom:10, display:'flex', alignItems:'center', justifyContent:'center', gap:10 }}>
          <span style={{ fontSize:18 }}>⚡</span> Оплатить через Click
        </button>

        <button onClick={openPayme}
          style={{ ...S.btn('#37C9C9'), marginBottom:10, display:'flex', alignItems:'center', justifyContent:'center', gap:10 }}>
          <span style={{ fontSize:18 }}>💳</span> Оплатить через Payme
        </button>

        <button onClick={onClose}
          style={{ ...S.btn(INK), opacity:0.7 }}>
          Оплачу наличными при получении
        </button>

        <div style={{ fontSize:11, color:MUTED, textAlign:'center', marginTop:10 }}>
          🔒 Безопасная оплата · SSL шифрование
        </div>
      </div>
    </div>
  );
}

// ── DARK THEME TOGGLE ─────────────────────────────────────────
const DARK_COLORS = {
  BG:    '#0F0D0C',
  PAPER: '#1A1614',
  INK:   '#F0EBE3',
  LINE:  '#2E2520',
  SAND:  '#1E1A16',
  MUTED: '#8A7A6A',
};


// ── MAIN APP ─────────────────────────────────────────────────
export default function ShopApp() {
  const [products, setProducts] = useState([]);
  const [photos, setPhotos]     = useState({});
  const [loading, setLoading]   = useState(true);
  const [cart, setCart]         = useState([]);
  const [favs, setFavs]         = useState([]);
  const [customer, setCustomer] = useState(null);
  const [pushOn, setPushOn]     = useState(typeof Notification!=='undefined' && Notification.permission==='granted');
  const [installPrompt, setInstallPrompt] = useState(null);
  const [screen, setScreen]     = useState('catalog');
  const [showAuth, setShowAuth] = useState(false);
  const [showOrder, setShowOrder] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastOrderSummary, setLastOrderSummary] = useState('');
  const [showFaq, setShowFaq]   = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [discount, setDiscount] = useState(0);
  const [search, setSearch]     = useState('');
  const [sortBy, setSortBy]     = useState('default');
  const [toasts, setToasts]     = useState([]);
  const [showFavOnly, setShowFavOnly] = useState(false);
  const [category, setCategory]     = useState('all');
  const [priceRange, setPriceRange] = useState([0, 1000]);
  const [showFilters, setShowFilters] = useState(false);
  const [quickView, setQuickView]     = useState(null);
  const [notifyProduct, setNotifyProduct] = useState(null);
  const [openProduct, setOpenProduct]   = useState(null);
  const [showConsultant, setShowConsultant] = useState(false);
  const [darkMode, setDarkMode]         = useState(false);
  const [lang, setLang]                 = useState('ru');
  const [showPayment, setShowPayment]   = useState(false);
  const [pendingOrder, setPendingOrder] = useState(null);
  const [recentlyViewed, setRecentlyViewed] = useState([]);
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
    Analytics.pageView();
  },[]);

  // PWA install prompt (Chrome/Android/desktop — Safari/iOS has no equivalent event)
  useEffect(()=>{
    const onBeforeInstall = (e) => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    return ()=>window.removeEventListener('beforeinstallprompt', onBeforeInstall);
  },[]);
  const installApp = async () => {
    if(!installPrompt) return;
    installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  };

  // Make the phone/browser "back" button close whatever screen or modal is
  // open instead of leaving the site — push one history entry whenever a
  // screen/modal opens, and close the top one when the user navigates back.
  const anyOverlayOpen = !!(openProduct || screen==='cart' || screen==='account' || screen2==='chat' || showAuth || quickView || notifyProduct || showConsultant || showFaq || showPrivacy || showCitySelector);
  const overlayPushedRef = useRef(false);
  useEffect(()=>{
    if(anyOverlayOpen && !overlayPushedRef.current){
      window.history.pushState({ qsOverlay:true }, '');
      overlayPushedRef.current = true;
    } else if(!anyOverlayOpen){
      overlayPushedRef.current = false;
    }
  },[anyOverlayOpen]);
  useEffect(()=>{
    const onPopState = () => {
      if(showPrivacy) return setShowPrivacy(false);
      if(showFaq) return setShowFaq(false);
      if(showCitySelector) return setShowCitySelector(false);
      if(notifyProduct) return setNotifyProduct(null);
      if(quickView) return setQuickView(null);
      if(showConsultant) return setShowConsultant(false);
      if(showAuth) return setShowAuth(false);
      if(screen2==='chat') return setScreen2('');
      if(openProduct) return setOpenProduct(null);
      if(screen==='cart'||screen==='account') return setScreen('catalog');
    };
    window.addEventListener('popstate', onPopState);
    return ()=>window.removeEventListener('popstate', onPopState);
  });

  // Show a toast for push notifications received while the app is open
  useEffect(()=>{
    if(!messaging) return;
    const unsub = onMessage(messaging, payload => {
      addToast(`🔔 ${payload.notification?.title||'Queen Star'}: ${payload.notification?.body||''}`);
    });
    return ()=>unsub && unsub();
  },[]);

  useEffect(()=>{
    document.title='Queen Star — Женская обувь Душанбе | Доставка по Таджикистану';
    const setMeta=(name,val)=>{
      let el=document.querySelector(`meta[name="${name}"]`)||document.querySelector(`meta[property="${name}"]`);
      if(!el){el=document.createElement('meta');el.setAttribute(name.includes(':')?'property':'name',name);document.head.appendChild(el);}
      el.setAttribute('content',val);
    };
    setMeta('description','Queen Star — магазин женской обуви в Душанбе. Туфли, сапоги, босоножки. Доставка по Таджикистану.');
    setMeta('og:title','Queen Star — Женская обувь Душанбе');
    setMeta('og:type','website');
  },[]);

  useEffect(()=>{
    try {
      const c = localStorage.getItem('qs_customer');
      const f = localStorage.getItem('qs_favs');
      const ci = localStorage.getItem('qs_city');
      const l = localStorage.getItem('qs_lang');
      const cat = localStorage.getItem('qs_category');
      const sort = localStorage.getItem('qs_sort');
      if(c) setCustomer(JSON.parse(c));
      if(f) setFavs(JSON.parse(f));
      if(ci) setCity(ci); else setShowCitySelector(true);
      if(l && DICT[l]) setLang(l);
      if(cat && CATEGORIES.some(x=>x.id===cat)) setCategory(cat);
      if(sort) setSortBy(sort);
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
  useEffect(()=>{ try{ localStorage.setItem('qs_category', category); }catch{} },[category]);
  useEffect(()=>{ try{ localStorage.setItem('qs_sort', sortBy); }catch{} },[sortBy]);

  const saveCity = (c) => { setCity(c); try{ localStorage.setItem('qs_city',c); }catch{}; };
  const saveLang = (l) => { setLang(l); try{ localStorage.setItem('qs_lang',l); }catch{}; };
  // Track recently viewed
  const viewProduct = (product) => {
    setOpenProduct(product);
    Analytics.productView(product.id, product.name);
    setRecentlyViewed(prev=>{
      const filtered = prev.filter(id=>id!==product.id);
      return [product.id, ...filtered].slice(0,10);
    });
  };

  // Update price range when products load
  useEffect(()=>{
    if(products.length){
      const prices = products.map(p=>p.price);
      setPriceRange([Math.min(...prices), Math.max(...prices)]);
    }
  },[products.length]);

  const logout = () => { setCustomer(null); try{ localStorage.removeItem('qs_customer'); }catch{}; setScreen('catalog'); };

  const toggleFav = (id) => {
    const willAdd = !favs.includes(id);
    const next = willAdd ? [...favs, id] : favs.filter(f=>f!==id);
    setFavs(next);
    try { localStorage.setItem('qs_favs', JSON.stringify(next)); } catch {}
    if(willAdd) addToast('❤️ Добавлено в избранное');
  };

  const addToCart = (item) => {
    setCart(p=>{
      const idx = p.findIndex(x=>x.id===item.id && x.size===item.size);
      if(idx>=0){
        const next = [...p];
        const qty = next[idx].qty + item.qty;
        next[idx] = { ...next[idx], qty, total: next[idx].price*qty };
        return next;
      }
      return [...p, item];
    });
    addToast('🛍 Добавлено в корзину');
    Analytics.addToCart(item.id, item.name, item.price);
  };
  const removeFromCart = (i) => setCart(p=>p.filter((_,idx)=>idx!==i));
  const updateCartQty = (i, delta) => setCart(p=>{
    const next = [...p];
    const qty = Math.max(1, next[i].qty + delta);
    next[i] = { ...next[i], qty, total: next[i].price*qty };
    return next;
  });
  const reorder = (order) => {
    const photo = firstPhoto(photos[order.productId]) || '';
    addToCart({ id:order.productId, name:order.productName, price:order.price, size:order.size, qty:order.qty, total:order.price*order.qty, photo });
    setScreen('cart');
  };
  const checkout = (d) => {
    setDiscount(d);
    setScreen('catalog');
    const total = cart.reduce((s,x)=>s+x.total,0);
    Analytics.checkout(Math.round(total*(1-d/100)));
    setShowOrder(true);
  };
  const onOrderSuccess = (summary) => { setCart([]); setShowOrder(false); setLastOrderSummary(summary||''); setShowSuccess(true); };

  // "Hit" products — top 3 by lowest stock ratio, simple deterministic heuristic
  const hitIds = [...products]
    .sort((a,b)=>(a.qty-(a.reserved||0))-(b.qty-(b.reserved||0)))
    .slice(0,3).map(p=>p.id);

  const allPrices = products.map(p=>p.price);
  const globalMin = allPrices.length ? Math.min(...allPrices) : 0;
  const globalMax = allPrices.length ? Math.max(...allPrices) : 1000;

  let filtered = products.filter(p=>{
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
    const matchFav = !showFavOnly || favs.includes(p.id);
    const matchCity = !city || !p.region || p.region==='both' || p.region===city;
    // Hide off-category products (men's sneakers КМ and winter women's ЖЗ are off-season)
    const matchCategory2 = !p.id.toUpperCase().startsWith('КМ') && !p.id.toUpperCase().startsWith('ЖЗ');
    const matchCat = category==='all' || getCat(p)===category;
    const matchPrice = p.price >= priceRange[0] && p.price <= priceRange[1];
    return matchSearch && matchFav && matchCity && matchCat && matchPrice && matchCategory2;
  });
  if(sortBy==='price_asc')  filtered = [...filtered].sort((a,b)=>a.price-b.price);
  if(sortBy==='price_desc') filtered = [...filtered].sort((a,b)=>b.price-a.price);
  if(sortBy==='new')        filtered = [...filtered].reverse();
  if(sortBy==='popular')    filtered = [...filtered].sort((a,b)=>(b.sold||0)-(a.sold||0));

  if(loading) return(
    <div style={{ background:BG, minHeight:'100vh' }}>
      <style>{`${FONTS}*{box-sizing:border-box;margin:0;padding:0;}
        @keyframes qsShimmer{0%{background-position:-300px 0;}100%{background-position:300px 0;}}
        .qs-skel{background:linear-gradient(90deg,${LINE} 25%,${SAND} 37%,${LINE} 63%);background-size:600px 100%;animation:qsShimmer 1.4s ease-in-out infinite;}`}</style>
      <div style={{ padding:'14px 16px', display:'flex', alignItems:'center', gap:9, borderBottom:`1px solid ${LINE}` }}>
        <div className="qs-skel" style={{ width:34, height:34, borderRadius:'50%', flexShrink:0 }}/>
        <div className="qs-skel" style={{ width:120, height:16, borderRadius:6 }}/>
      </div>
      <div style={{ padding:'14px' }}>
        <div className="qs-skel" style={{ height:110, borderRadius:20, marginBottom:16 }}/>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          {Array.from({length:6}).map((_,i)=>(
            <div key={i} style={{ borderRadius:18, overflow:'hidden', border:`1px solid ${LINE}` }}>
              <div className="qs-skel" style={{ height:188 }}/>
              <div style={{ padding:13 }}>
                <div className="qs-skel" style={{ height:9, width:'35%', borderRadius:4, marginBottom:9 }}/>
                <div className="qs-skel" style={{ height:13, width:'85%', borderRadius:4, marginBottom:9 }}/>
                <div className="qs-skel" style={{ height:17, width:'55%', borderRadius:4 }}/>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const t = (key) => (DICT[lang]||DICT.ru)[key];

  return(
    <CityContext.Provider value={city}>
    <LangContext.Provider value={lang}>
    <div style={{ background:BG, minHeight:'100vh', color:INK, fontFamily:"'Manrope',sans-serif" }}>
      <style>{`${FONTS}*{box-sizing:border-box;margin:0;padding:0;}input::placeholder,textarea::placeholder{color:#B8A98E;}button:disabled{opacity:0.6;}
        @keyframes qsScreenIn{from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:translateY(0);}}
        @keyframes qsSheetIn{from{opacity:0;transform:translateY(24px);}to{opacity:1;transform:translateY(0);}}
        @keyframes qsFadeIn{from{opacity:0;}to{opacity:1;}}
        .qs-screen-in{animation:qsScreenIn 0.22s ease-out;}
        .qs-sheet-in{animation:qsSheetIn 0.24s cubic-bezier(0.22,1,0.36,1);}
        .qs-fade-in{animation:qsFadeIn 0.18s ease-out;}`}</style>
      <Toast toasts={toasts}/>
      <Header cartCount={cart.length} favCount={favs.length}
        onCart={()=>setScreen('cart')}
        onAccount={()=>customer?setScreen('account'):setShowAuth(true)}
        onFav={()=>setShowFavOnly(!showFavOnly)}
        onFaq={()=>setShowFaq(true)}
        customer={customer}/>

      {openProduct && <ProductPage
        product={openProduct} photos={photos}
        onAddToCart={addToCart} isFav={favs.includes(openProduct.id)} onToggleFav={toggleFav}
        onClose={()=>setOpenProduct(null)} allProducts={products} addToast={addToast} onView={viewProduct}/>}
      {showPayment && pendingOrder && <PaymentModal
        total={pendingOrder.total} orderId={pendingOrder.id||Date.now()}
        onClose={()=>setShowPayment(false)}
        onPaid={(method)=>{ addToast(`✅ Оплата через ${method} принята!`); setShowPayment(false); }}/>}
      {quickView && <QuickView product={quickView} photo={firstPhoto(photos[quickView.id])} onAddToCart={(item)=>{addToCart(item);setQuickView(null);}} onClose={()=>setQuickView(null)} isFav={favs.includes(quickView.id)} onToggleFav={toggleFav}/>}
      {showConsultant && <ConsultantChat onClose={()=>setShowConsultant(false)}/>}
      {notifyProduct && <NotifyModal product={notifyProduct} onClose={()=>setNotifyProduct(null)}/>}
      {showCitySelector && <CitySelector city={city} setCity={saveCity} onClose={()=>setShowCitySelector(false)}/>}
      {showAuth && <AuthModal onClose={()=>setShowAuth(false)} onLogin={login}/>}
      {screen2==='chat' && (
        <div className="qs-screen-in" style={{ position:'fixed', inset:0, background:BG, zIndex:200 }}>
          <div style={{ background:PAPER, borderBottom:`1px solid ${LINE}`, padding:'13px 16px', display:'flex', alignItems:'center', gap:12 }}>
            <button onClick={()=>setScreen2('')} style={{ background:'none', border:'none', fontSize:22, cursor:'pointer', color:INK }}>←</button>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:17, color:INK, fontWeight:700 }}>💬 Чат покупателей</div>
          </div>
          <ProductChat customer={customer} products={products} photos={photos} onAddToCart={addToCart} onNeedAuth={()=>{setScreen2('');setShowAuth(true);}}/>
        </div>
      )}
      {showSuccess && <SuccessPage onClose={()=>setShowSuccess(false)} orderSummary={lastOrderSummary}/>}
      {showOrder && customer && <OrderForm cart={cart} customer={customer} discount={discount} onClose={()=>setShowOrder(false)} onSuccess={onOrderSuccess}/>}
      {showFaq && (
        <div className="qs-fade-in" style={{ position:'fixed', inset:0, background:'rgba(35,26,20,0.4)', zIndex:300, display:'flex', alignItems:'flex-end', justifyContent:'center' }} onClick={()=>setShowFaq(false)}>
          <div className="qs-sheet-in" style={{ background:BG, borderRadius:'24px 24px 0 0', padding:20, width:'100%', maxWidth:480, maxHeight:'80vh', overflowY:'auto' }} onClick={e=>e.stopPropagation()}>
            <div style={{ width:36, height:4, background:LINE, borderRadius:2, margin:'0 auto 14px' }}/>
            <FaqSection/>
            <button style={{ ...S.btn(GOLD), marginTop:16 }} onClick={()=>setShowFaq(false)}>Закрыть</button>
          </div>
        </div>
      )}
      {showPrivacy && (
        <div className="qs-fade-in" style={{ position:'fixed', inset:0, background:'rgba(35,26,20,0.4)', zIndex:300, display:'flex', alignItems:'flex-end', justifyContent:'center' }} onClick={()=>setShowPrivacy(false)}>
          <div className="qs-sheet-in" style={{ background:BG, borderRadius:'24px 24px 0 0', padding:20, width:'100%', maxWidth:480, maxHeight:'80vh', overflowY:'auto' }} onClick={e=>e.stopPropagation()}>
            <div style={{ width:36, height:4, background:LINE, borderRadius:2, margin:'0 auto 14px' }}/>
            <PrivacyPolicy/>
            <button style={{ ...S.btn(GOLD), marginTop:16 }} onClick={()=>setShowPrivacy(false)}>Закрыть</button>
          </div>
        </div>
      )}
      {screen==='cart' && <CartPage cart={cart} onClose={()=>setScreen('catalog')} onCheckout={checkout} onRemove={removeFromCart} onQtyChange={updateCartQty} customer={customer} onNeedAuth={()=>{setScreen('catalog');setShowAuth(true);}}/>}
      {screen==='account' && customer && <AccountPage customer={customer} onClose={()=>setScreen('catalog')} onLogout={logout} addToast={addToast} pushOn={pushOn} setPushOn={setPushOn} onReorder={reorder}/>}

      {darkMode && <style>{'body,#root{background:#0F0D0C!important;}input,select,textarea{background:#1A1614!important;color:#F0EBE3!important;border-color:#2E2520!important;}'}</style>}
      {screen==='catalog' && (
        <div style={{ ...S.page, padding:'14px 14px 30px' }}>
          {/* Banner */}
          <div style={{ background:`linear-gradient(135deg,${INK},#3A2C20)`, borderRadius:20, padding:'22px 20px', marginBottom:16, color:'#fff', textAlign:'center', position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', top:-30, right:-30, width:110, height:110, borderRadius:'50%', background:GOLD+'22' }}/>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:25, letterSpacing:0.5, marginBottom:5, fontWeight:700, position:'relative' }}>Queen <span style={{color:GOLD_L}}>Star</span></div>
            <div style={{ fontSize:12, opacity:0.8, marginBottom:14, position:'relative' }}>{t('tagline')}</div>
            <div style={{ display:'flex', justifyContent:'center', gap:14, flexWrap:'wrap', position:'relative' }}>
              {[t('perk_delivery'),t('perk_pay'),t('perk_return')].map(perk=>(
                <div key={perk} style={{ fontSize:10.5, opacity:0.85, fontWeight:600 }}>{perk}</div>
              ))}
            </div>
          </div>

          <div style={{ marginBottom:10 }}><StoreHours/></div>
          <div style={{ display:'flex', gap:8, marginBottom:10, alignItems:'center', flexWrap:'wrap' }}>
            <button onClick={()=>setShowCitySelector(true)}
              style={{ ...S.btnGhost(city==='russia'?'#4A6FA5':GOLD), fontSize:12, padding:'7px 12px' }}>
              {city==='russia'?'🇷🇺 Россия':'🇹🇯 Душанбе'}
            </button>
            <button onClick={()=>setScreen2('chat')}
              style={{ ...S.btnGhost(BLUE), fontSize:12, padding:'7px 12px' }}>
              💬 Чат покупателей
            </button>
            <button onClick={()=>setDarkMode(!darkMode)}
              style={{ ...S.btnGhost(darkMode?GOLD_D:'#555'), fontSize:12, padding:'7px 12px' }}>
              {darkMode?'☀️ Светлая':'🌙 Тёмная'}
            </button>
            <button onClick={()=>saveLang(lang==='ru'?'tj':lang==='tj'?'en':'ru')}
              style={{ ...S.btnGhost('#555'), fontSize:12, padding:'7px 12px' }}>
              🌐 {LANG_LABEL[lang]}
            </button>
            {installPrompt && (
              <button onClick={installApp} style={{ ...S.btnGhost(GOLD), fontSize:12, padding:'7px 12px' }}>
                📲 Установить
              </button>
            )}
          </div>
          {customer && !pushOn && (
            <div style={{ ...S.card, padding:'12px 14px', marginBottom:14, display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ fontSize:20 }}>🔔</div>
              <div style={{ flex:1, fontSize:12, color:INK }}>Включи уведомления, чтобы узнавать о статусе заказа</div>
              <button style={{ ...S.btnGhost(GOLD), padding:'7px 11px', fontSize:11, whiteSpace:'nowrap' }}
                onClick={async()=>{ if(await enablePush(customer, addToast)) setPushOn(true); }}>Включить</button>
            </div>
          )}
          <FlashSaleBanner/>

          {/* Search */}
          <div style={{ position:'relative', marginBottom:10 }}>
            <input style={{ ...S.input, paddingLeft:42 }} value={search} onChange={e=>setSearch(e.target.value)} placeholder={t('search_ph')}/>
            <span style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', fontSize:16, color:MUTED }}>🔍</span>
          </div>

          {/* Category tabs */}
          <div style={{ display:'flex', gap:6, overflowX:'auto', marginBottom:10, paddingBottom:2 }}>
            {CATEGORIES.map(cat=>(
              <div key={cat.id} onClick={()=>setCategory(cat.id)} style={S.chip(category===cat.id)}>
                {cat.icon} {t(cat.id)}
              </div>
            ))}
          </div>
          {/* Filter bar */}
          <div style={{ display:'flex', gap:6, marginBottom:12, overflowX:'auto' }}>
            <div onClick={()=>setShowFavOnly(!showFavOnly)} style={S.chip(showFavOnly)}>❤️{favs.length>0?` ${favs.length}`:''}</div>
            <div onClick={()=>setSortBy('default')} style={S.chip(sortBy==='default')}>{t('popular')}</div>
            <div onClick={()=>setSortBy('new')} style={S.chip(sortBy==='new')}>{t('new_')}</div>
            <div onClick={()=>setSortBy('price_asc')} style={S.chip(sortBy==='price_asc')}>{t('price_up')}</div>
            <div onClick={()=>setSortBy('price_desc')} style={S.chip(sortBy==='price_desc')}>{t('price_down')}</div>
            <div onClick={()=>setShowFilters(!showFilters)} style={S.chip(showFilters)}>{t('filters')}</div>
            <div onClick={()=>setShowConsultant(true)} style={S.chip(false)}>{t('consultant')}</div>
          </div>
          {showFilters && (
            <div style={{ marginBottom:14 }}>
              <PriceFilter min={globalMin} max={globalMax} value={priceRange} onChange={setPriceRange}/>
            </div>
          )}

          <div style={{ fontSize:12, color:MUTED, marginBottom:12, fontWeight:600 }}>{t('products_count')(filtered.length)}</div>

          {filtered.length===0 ? (
            <div style={{ textAlign:'center', padding:'50px 0', color:MUTED }}>
              <div style={{ fontSize:38, marginBottom:12 }}>😔</div>
              {showFavOnly ? t('no_favs') : t('nothing_found')}
            </div>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              {filtered.map(p=>(
                <div key={p.id} onClick={()=>viewProduct(p)} style={{ cursor:'pointer' }}>
                <ProductCard product={p} photo={firstPhoto(photos[p.id])}
                  onAddToCart={addToCart} isFav={favs.includes(p.id)} onToggleFav={toggleFav}
                  isHit={hitIds.includes(p.id)} onQuickView={setQuickView} onNotify={setNotifyProduct}/>
              </div>
              ))}
            </div>
          )}

          <RecentlyViewed productIds={recentlyViewed} allProducts={products} photos={photos} onView={viewProduct}/>

          {/* Social proof */}
          <div style={{ ...S.card, padding:18, marginTop:22, textAlign:'center' }}>
            <div style={{ fontSize:26, marginBottom:4 }}>🏆</div>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:17, fontWeight:700, color:INK }}>500+ довольных покупателей</div>
            <div style={{ fontSize:12, color:MUTED, marginTop:4 }}>в Душанбе и по всему Таджикистану</div>
          </div>

          {/* FAQ */}
          <OutfitBuilder products={products} photos={photos} onAddToCart={addToCart}/>
          <div style={{ marginTop:14 }}><FaqSection/></div>
          <StoreMap/>

          {/* Contact */}
          <div style={{ ...S.card, padding:18, marginTop:14, textAlign:'center' }}>
            <div style={{ fontSize:14, fontWeight:700, color:INK, marginBottom:12 }}>{t('contact_us')}</div>
            <div style={{ display:'flex', gap:10, justifyContent:'center', flexWrap:'wrap' }}>
              <a href="https://t.me/yoqubzodaamir" target="_blank" style={{ ...S.btnGhost(BLUE), textDecoration:'none', display:'inline-block' }}>📱 Telegram</a>
              <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" style={{ ...S.btnGhost(GREEN), textDecoration:'none', display:'inline-block' }}>💬 WhatsApp</a>
              <a href="https://instagram.com/queenstar.stor" target="_blank" style={{ ...S.btnGhost(GOLD), textDecoration:'none', display:'inline-block' }}>📸 Instagram</a>
            </div>
            <div style={{ fontSize:11, color:MUTED, marginTop:14 }}>Душанбе, Таджикистан</div>
            <button onClick={()=>setShowPrivacy(true)} style={{ background:'none', border:'none', color:MUTED, fontSize:11, textDecoration:'underline', cursor:'pointer', marginTop:8, fontFamily:'inherit' }}>Политика конфиденциальности</button>
          </div>
        </div>
      )}
      {/* Floating consultant button */}
      {screen==='catalog' && !showConsultant && !openProduct && (
        <button onClick={()=>setShowConsultant(true)}
          style={{ position:'fixed', bottom:80, right:16, width:52, height:52, borderRadius:'50%', background:GOLD, border:'none', boxShadow:'0 4px 16px rgba(194,138,46,0.4)', cursor:'pointer', fontSize:22, zIndex:100, display:'flex', alignItems:'center', justifyContent:'center' }}>
          💬
        </button>
      )}
    </div>
    </LangContext.Provider>
    </CityContext.Provider>
  );
}