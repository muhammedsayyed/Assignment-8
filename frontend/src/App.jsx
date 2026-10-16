import { useCallback, useEffect, useMemo, useState } from 'react'

const tokenStore = 'spy-app.accessToken'
const storedToken = localStorage.getItem(tokenStore) || ''
const sections = [
  ['home', 'Overview', '⌂'],
  ['inbox', 'Messages', '✉'],
  ['requests', 'Identity requests', '◇'],
  ['chats', 'Conversations', '◌'],
  ['profile', 'My profile', '◎']
]
const dateLabel = value => value ? new Date(value).toLocaleString() : ''
const assetUrl = path => `/assets/${String(path || '').replace(/^assets\//, '')}`

function App() {
  const [token, setToken] = useState(() => storedToken)
  const [profile, setProfile] = useState(null)
  const [page, setPage] = useState('home')
  const [authMode, setAuthMode] = useState('login')
  const [inboxType, setInboxType] = useState('received')
  const [activeChat, setActiveChat] = useState('')
  const [toast, setToast] = useState('')
  const [busy, setBusy] = useState(false)

  const notify = useCallback(message => {
    setToast(message)
    window.setTimeout(() => setToast(''), 3200)
  }, [])

  const api = useCallback(async (path, options = {}) => {
    const headers = { ...(token ? { Authorization: token } : {}), ...options.headers }
    if (options.body && !(options.body instanceof FormData)) headers['Content-Type'] = 'application/json'
    const response = await fetch(path, {
      ...options,
      headers,
      body: options.body && !(options.body instanceof FormData) ? JSON.stringify(options.body) : options.body
    })
    const result = await response.json().catch(() => ({}))
    if (!response.ok || result.status === false) {
      const issueMessage = result.issues?.map(issue => issue.message).filter(Boolean).join(', ')
      throw new Error(issueMessage || result.error_message || result.message || `Request failed (${response.status})`)
    }
    return result.data
  }, [token])

  const acceptToken = useCallback(value => {
    localStorage.setItem(tokenStore, value)
    setToken(value)
    setPage('home')
    setAuthMode('login')
  }, [])

  const refreshProfile = useCallback(async () => {
    if (!token) { setProfile(null); return }
    try { setProfile(await api('/user')) }
    catch { localStorage.removeItem(tokenStore); setToken(''); setProfile(null); setAuthMode('login') }
  }, [api, token])

  useEffect(() => { refreshProfile() }, [refreshProfile])

  const perform = async operation => {
    setBusy(true)
    try { await operation() }
    catch (error) { notify(error.message) }
    finally { setBusy(false) }
  }

  const logout = () => perform(async () => {
    try { await api('/user/logout', { method: 'POST', body: { action: 'DEVICE' } }) } catch {}
    localStorage.removeItem(tokenStore)
    setToken(''); setProfile(null); setPage('home'); setAuthMode('login')
  })

  if (new URLSearchParams(location.search).has('to')) {
    return <PublicMessage api={api} busy={busy} perform={perform} notify={notify} toast={toast} />
  }
  if (!token || !profile) {
    return <AuthScreen mode={authMode} setMode={setAuthMode} api={api} busy={busy} perform={perform} notify={notify} acceptToken={acceptToken} toast={toast} />
  }

  return <div className="app-shell">
    <aside className="sidebar">
      <a className="brand" href="/app/"><span className="brand-mark">S</span><span>Spy App</span></a>
      <div className="sidebar-label">YOUR SPACE</div>
      <nav className="side-nav" aria-label="Main navigation">
        {sections.map(([id, label, icon]) => <button key={id} className={page === id ? 'nav-link selected' : 'nav-link'} onClick={() => setPage(id)}><span className="nav-icon">{icon}</span>{label}</button>)}
      </nav>
      <div className="sidebar-bottom"><div className="privacy-mark">✳</div><strong>A softer place to speak.</strong><p>Your messages stay in your space.</p></div>
    </aside>
    <main className="main-area">
      <header className="topbar"><span className="top-kicker">PERSONAL SPACE <b>/</b> {sections.find(item => item[0] === page)?.[1].toUpperCase()}</span><div className="account-chip"><span className="avatar">{profile.username?.slice(0, 1)?.toUpperCase() || 'S'}</span><span>{profile.username}</span><button className="text-button" onClick={logout}>Sign out</button></div></header>
      {page === 'home' && <Dashboard api={api} profile={profile} navigate={setPage} notify={notify} perform={perform} />}
      {page === 'inbox' && <Inbox api={api} type={inboxType} setType={setInboxType} notify={notify} perform={perform} />}
      {page === 'requests' && <Requests api={api} notify={notify} perform={perform} onChat={() => setPage('chats')} />}
      {page === 'chats' && <Chats api={api} profile={profile} activeChat={activeChat} setActiveChat={setActiveChat} notify={notify} perform={perform} />}
      {page === 'profile' && <Profile api={api} profile={profile} setProfile={setProfile} notify={notify} perform={perform} />}
    </main>
    {toast && <div className="toast" role="status">{toast}</div>}
  </div>
}

function AuthScreen({ mode, setMode, api, busy, perform, notify, acceptToken, toast }) {
  const [resetRequested, setResetRequested] = useState(false)
  const titles = { login: 'Welcome back', signup: 'Make room for honesty', resend: 'Verify your email', verify: 'Check your inbox', 'confirm-login': 'One more step', forgot: 'Reset your password' }
  const submit = event => {
    event.preventDefault()
    const form = event.currentTarget
    const data = Object.fromEntries(new FormData(form))
    perform(async () => {
      if (mode === 'login') {
        sessionStorage.setItem('login.email', data.email)
        const result = await api('/auth/login', { method: 'POST', body: data })
        if (result?.twoStepVerification) { setMode('confirm-login'); return }
        acceptToken(result.access_token)
      } else if (mode === 'signup') {
        await api('/auth/signup', { method: 'POST', body: data })
        sessionStorage.setItem('signup.email', data.email); setMode('verify'); notify('Verification code sent. Check your email.')
      } else if (mode === 'resend') {
        await api('/auth/resend-confirm-email', { method: 'PATCH', body: { email: data.email } })
        sessionStorage.setItem('signup.email', data.email); setMode('verify'); notify('Verification code sent. Check your email.')
      } else if (mode === 'verify') {
        await api('/auth/confirm-email', { method: 'PATCH', body: data }); setMode('login'); notify('Email verified. You can sign in.')
      } else if (mode === 'confirm-login') {
        const result = await api('/auth/login-confirmation', { method: 'POST', body: data }); acceptToken(result.access_token)
      } else if (mode === 'forgot') {
        if (!resetRequested) {
          await api('/auth/request-confirm-password', { method: 'POST', body: { email: data.email } })
          setResetRequested(true); notify('Reset code sent. Enter it below, then submit again.')
        } else {
          await api('/auth/reset-password', { method: 'PATCH', body: data }); setMode('login'); notify('Password changed.')
        }
      }
    })
  }
  const resendVerification = () => perform(async () => {
    const email = sessionStorage.getItem('signup.email')
    await api('/auth/resend-confirm-email', { method: 'PATCH', body: { email } })
    notify('A new code was requested. Check your inbox or the backend terminal in development.')
  })
  return <main className="auth-page">
    <section className="auth-story"><a className="brand" href="/app/"><span className="brand-mark">S</span><span>Spy App</span></a><div className="story-copy"><p className="overline">A LITTLE MORE HUMAN</p><h1>Some things are easier when you can just say them.</h1><p>A private corner for thoughtful notes, honest replies, and conversations that happen on your terms.</p></div><div className="story-footer"><span>01 — PRIVATE NOTES</span><span>02 — REAL CONNECTION</span></div><div className="story-orbit orbit-one"/><div className="story-orbit orbit-two"/></section>
    <section className="auth-panel"><div className="auth-card"><p className="overline">YOUR SPACE IS WAITING</p><h2>{titles[mode]}</h2><p className="muted auth-intro">{mode === 'signup' ? 'Create your account and start with a clean slate.' : mode === 'resend' ? 'We will send a new verification code to your email.' : mode === 'verify' ? 'Enter the email address and code we sent you.' : 'Sign in to see your messages and conversations.'}</p>
      <form className="form-stack" onSubmit={submit}>
        {mode === 'login' && <><Field label="Email" name="email" type="email" required /><Field label="Password" name="password" type="password" required /><button className="button-link align-right" type="button" onClick={() => { setResetRequested(false); setMode('forgot') }}>Forgot password?</button></>}
        {mode === 'signup' && <><Field label="Your name" name="username" placeholder="First and last name" minLength="5" required /><Field label="Email" name="email" type="email" required /><Field label="Phone" name="phone" type="tel" placeholder="+201000000000" required /><Field label="Password" name="password" type="password" minLength="8" required /><Field label="Confirm password" name="confirmPassword" type="password" minLength="8" required /></>}
        {mode === 'resend' && <Field label="Email" name="email" type="email" required />}
        {mode === 'verify' && <><Field label="Email" name="email" type="email" defaultValue={sessionStorage.getItem('signup.email') || ''} required /><Field label="Verification code" name="otp" inputMode="numeric" required /><button className="button-link align-right" type="button" disabled={busy} onClick={resendVerification}>Resend verification code</button></>}
        {mode === 'confirm-login' && <><Field label="Email" name="email" type="email" defaultValue={sessionStorage.getItem('login.email') || ''} required /><Field label="Verification code" name="otp" inputMode="numeric" required /></>}
        {mode === 'forgot' && <><Field label="Email" name="email" type="email" required />{resetRequested && <><Field label="Reset code" name="otp" inputMode="numeric" required /><Field label="New password" name="password" type="password" minLength="8" required /><Field label="Confirm password" name="confirmPassword" type="password" minLength="8" required /></>}</>}
        <button className="button primary wide" disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : mode === 'signup' ? 'Create account' : mode === 'resend' ? 'Send verification code' : mode === 'verify' ? 'Verify email' : mode === 'confirm-login' ? 'Finish sign in' : resetRequested ? 'Change password' : 'Send reset code'}<span>↗</span></button>
      </form>
      <div className="auth-switch">{mode === 'login' ? <>New to Spy App? <button onClick={() => setMode('signup')}>Create an account</button><br /><button onClick={() => setMode('resend')}>Resend verification code</button></> : <><button onClick={() => { setResetRequested(false); setMode('login') }}>← Back to sign in</button>{mode === 'signup' && <> <span>·</span> Already registered? <button onClick={() => setMode('login')}>Sign in</button></>}</>}</div>
    </div><p className="auth-legal">PRIVATE BY DEFAULT <span>•</span> MADE FOR GOOD WORDS</p>{toast && <div className="toast" role="alert">{toast}</div>}</section>
  </main>
}

function Field({ label, ...props }) { return <label className="field"><span>{label}</span><input {...props} /></label> }

function PublicMessage({ api, busy, perform, notify, toast }) {
  const receiver = new URLSearchParams(location.search).get('to')
  const [sent, setSent] = useState(false)
  const submit = event => {
    event.preventDefault()
    const body = new FormData(event.currentTarget); body.set('receiver', receiver)
    perform(async () => { await api('/message', { method: 'POST', body }); setSent(true); notify('Your note was delivered.') })
  }
  return <main className="public-page"><div className="public-top"><a className="brand" href="/app/"><span className="brand-mark">S</span><span>Spy App</span></a><span className="public-badge">✳ PRIVATE NOTE</span></div><section className="public-card"><p className="overline">A NOTE WITHOUT A NAME</p><h1>{sent ? 'Your words are on their way.' : 'Leave a thoughtful note.'}</h1><p className="muted">{sent ? 'Thanks for taking a moment to share something kind.' : 'Write what you mean. Your identity stays private.'}</p>{!sent && <form className="form-stack public-form" onSubmit={submit}><label className="field"><span>Your message</span><textarea name="content" rows="6" maxLength="1000" placeholder="Start writing here…" required /></label><label className="field"><span>Images, if you like <small>(up to 3)</small></span><input type="file" name="attachments" accept="image/jpeg,image/png,image/gif" multiple /></label><button className="button primary wide" disabled={busy}>Send privately <span>↗</span></button></form>}</section><p className="public-foot">SAY IT WITH CARE <span>✳</span> KEEP IT HUMAN</p>{toast && <div className="toast" role="alert">{toast}</div>}</main>
}

function PageHeading({ eyebrow, title, subtitle, action }) { return <div className="page-heading"><div><p className="overline">{eyebrow}</p><h1>{title}</h1><p className="muted">{subtitle}</p></div>{action}</div> }
function Empty({ children }) { return <div className="empty-state"><span>✳</span><p>{children}</p></div> }
function Card({ children, className = '' }) { return <section className={`card ${className}`}>{children}</section> }

function Dashboard({ api, profile, navigate, notify, perform }) {
  const [messages, setMessages] = useState([]); const [requests, setRequests] = useState([]); const [chats, setChats] = useState([])
  const load = useCallback(async () => {
    try { const [m, r, c] = await Promise.all([api('/message?type=received'), api('/identity-request/received'), api('/conversation')]); setMessages(m || []); setRequests(r || []); setChats(c || []) }
    catch (error) { notify(error.message) }
  }, [api, notify])
  useEffect(() => { load() }, [load])
  const shareLink = `${location.origin}/app/?to=${encodeURIComponent(profile._id || '')}`
  return <div className="page-content"><PageHeading eyebrow="YOUR PRIVATE SPACE" title={`Hello, ${profile.username?.split(' ')[0] || 'friend'}.`} subtitle="A quick look at the words and connections waiting for you." action={<button className="button primary" onClick={() => perform(async () => { await navigator.clipboard.writeText(shareLink); notify('Your private link is copied.') })}>Copy my link <span>↗</span></button>} />
    <div className="stats-row"><Stat label="Notes received" number={messages.length} accent="✉"/><Stat label="Waiting to be read" number={messages.filter(item => !item.isRead).length} accent="◉"/><Stat label="Conversations" number={chats.length} accent="◌"/></div>
    <div className="dashboard-grid"><Card className="recent-card"><div className="card-heading"><div><p className="overline">FRESH FROM YOUR INBOX</p><h2>Recent notes</h2></div><button className="button subtle" onClick={() => navigate('inbox')}>Open messages ↗</button></div>{messages.length ? <div className="message-list">{messages.slice(0, 3).map(item => <MessageItem key={item._id} item={item} api={api} notify={notify} perform={perform} onChange={load}/>)}</div> : <Empty>Your first note will find its way here.</Empty>}</Card>
      <Card className="share-card"><p className="overline">PASS IT ALONG</p><div className="share-art">✳</div><h2>Your link, your space.</h2><p className="muted">Share this link and invite someone to leave a private note.</p><div className="share-url">{shareLink}</div><button className="button outline wide" onClick={() => perform(async () => { await navigator.clipboard.writeText(shareLink); notify('Your private link is copied.') })}>Copy link</button></Card>
      <Card className="request-preview"><div className="card-heading"><div><p className="overline">YOUR CALL</p><h2>Identity requests</h2></div><button className="button subtle" onClick={() => navigate('requests')}>See all ↗</button></div>{requests.filter(r => r.status === 0).length ? requests.filter(r => r.status === 0).slice(0, 2).map(item => <RequestItem key={item._id} item={item} api={api} notify={notify} perform={perform} onDone={load} />) : <Empty>No requests need your attention.</Empty>}</Card>
    </div>
  </div>
}
function Stat({ label, number, accent }) { return <div className="stat-card"><div><span>{label}</span><strong>{number}</strong></div><i>{accent}</i></div> }

function MessageItem({ item, sent = false, api, notify, perform, onChange }) {
  const requestIdentity = () => perform(async () => { await api(`/message/${item._id}/identity-request`, { method: 'POST' }); notify('Identity request sent.'); onChange?.() })
  const markRead = () => perform(async () => { await api(`/message/${item._id}/read`, { method: 'PATCH' }); onChange?.() })
  const remove = () => perform(async () => { if (!window.confirm('Delete this message?')) return; await api(`/message/${item._id}`, { method: 'DELETE' }); notify('Message deleted.'); onChange?.() })
  return <article className={`message-item ${!item.isRead && !sent ? 'is-unread' : ''}`}><div className="message-copy"><div className="message-meta"><strong>{sent ? 'Message you sent' : item.isAnonymous ? 'Anonymous note' : 'Message'}</strong><time>{dateLabel(item.createdAt)}</time></div><p>{item.content}</p>{item.attachments?.length > 0 && <div className="attachment-row">{item.attachments.map((image, index) => <a key={image + index} href={assetUrl(image)} target="_blank" rel="noreferrer"><img src={assetUrl(image)} alt="Message attachment" /></a>)}</div>}</div>{!sent && <div className="message-actions">{!item.isRead && <button className="mini-action" onClick={markRead}>Mark read</button>}{item.canRequestIdentity && <button className="mini-action" onClick={requestIdentity}>Ask who sent it</button>}<button className="mini-action danger-text" onClick={remove}>Delete</button></div>}</article>
}

function Inbox({ api, type, setType, notify, perform }) {
  const [messages, setMessages] = useState([])
  const load = useCallback(async () => { try { setMessages(await api(`/message?type=${type}`) || []) } catch (error) { notify(error.message) } }, [api, type, notify])
  useEffect(() => { load() }, [load])
  return <div className="page-content"><PageHeading eyebrow="WORDS SHARED WITH YOU" title="Messages" subtitle="Read a note, reply through an identity request, or clear it from your inbox."/><Card><div className="tabs"><button className={type === 'received' ? 'tab active' : 'tab'} onClick={() => setType('received')}>Received</button><button className={type === 'sent' ? 'tab active' : 'tab'} onClick={() => setType('sent')}>Sent</button></div>{messages.length ? <div className="message-list">{messages.map(item => <MessageItem key={item._id} item={item} api={api} sent={type === 'sent'} notify={notify} perform={perform} onChange={load}/>)}</div> : <Empty>{type === 'sent' ? 'You have no sent messages yet.' : 'Nothing here yet. Share your link to receive the first note.'}</Empty>}</Card></div>
}

function RequestItem({ item, api, notify, perform, onDone, onAccepted }) {
  const respond = accepted => perform(async () => { await api(`/identity-request/${item._id}/${accepted ? 'accept' : 'reject'}`, { method: 'PATCH' }); if (accepted) { await api(`/identity-request/${item._id}/conversation`, { method: 'POST' }); onAccepted?.() } notify(accepted ? 'Request accepted. A conversation is ready.' : 'Request declined.'); onDone?.() })
  return <article className="request-item"><div><strong>Someone wants to share who they are</strong><p>{item.message?.content || 'They sent you a note and are asking to reveal their identity.'}</p><time>{dateLabel(item.createdAt)}</time></div><div className="request-actions"><button className="button primary small" onClick={() => respond(true)}>Accept</button><button className="button quiet small" onClick={() => respond(false)}>Decline</button></div></article>
}

function Requests({ api, notify, perform, onChat }) {
  const [received, setReceived] = useState([]); const [sent, setSent] = useState([])
  const load = useCallback(async () => { try { const [r, s] = await Promise.all([api('/identity-request/received'), api('/identity-request/sent')]); setReceived(r || []); setSent(s || []) } catch (error) { notify(error.message) } }, [api, notify])
  useEffect(() => { load() }, [load])
  return <div className="page-content"><PageHeading eyebrow="YOUR CHOICE" title="Identity requests" subtitle="Choose when a private note turns into a conversation."/><div className="two-column"><Card><div className="card-heading"><div><p className="overline">INCOMING</p><h2>For you</h2></div><span className="count-badge">{received.filter(x => x.status === 0).length}</span></div>{received.length ? received.map(item => <RequestItem key={item._id} item={item} api={api} notify={notify} perform={perform} onDone={load} onAccepted={onChat} />) : <Empty>No incoming requests.</Empty>}</Card><Card><div className="card-heading"><div><p className="overline">OUTGOING</p><h2>You sent</h2></div></div>{sent.length ? sent.map(item => <article className="request-item" key={item._id}><div><strong>Identity request</strong><p>{item.message?.content || 'A note you sent'}</p><time>{dateLabel(item.createdAt)}</time></div><span className={`status-pill status-${item.status}`}>{item.status === 1 ? 'Accepted' : item.status === 2 ? 'Declined' : 'Pending'}</span></article>) : <Empty>You have not sent an identity request.</Empty>}</Card></div><button className="button-link after-note" onClick={onChat}>Go to conversations ↗</button></div>
}

function Chats({ api, profile, activeChat, setActiveChat, notify, perform }) {
  const [chats, setChats] = useState([]); const [messages, setMessages] = useState([])
  const loadChats = useCallback(async () => { try { setChats(await api('/conversation') || []) } catch (error) { notify(error.message) } }, [api, notify])
  const loadMessages = useCallback(async () => { if (!activeChat) return; try { setMessages(await api(`/conversation/${activeChat}/messages`) || []) } catch (error) { notify(error.message); setActiveChat('') } }, [api, activeChat, notify, setActiveChat])
  useEffect(() => { loadChats() }, [loadChats]); useEffect(() => { loadMessages() }, [loadMessages])
  const current = chats.find(item => item._id === activeChat)
  const send = event => { event.preventDefault(); const form = event.currentTarget; const body = Object.fromEntries(new FormData(form)); perform(async () => { await api(`/conversation/${activeChat}/messages`, { method: 'POST', body }); form.reset(); await loadMessages() }) }
  const remove = () => perform(async () => { if (!window.confirm('Delete this conversation and its messages?')) return; await api(`/conversation/${activeChat}`, { method: 'DELETE' }); setActiveChat(''); notify('Conversation deleted.'); await loadChats() })
  return <div className="page-content"><PageHeading eyebrow="PRIVATE, BETWEEN YOU" title="Conversations" subtitle="A personal conversation starts after an identity request is accepted."/><Card className="chat-card"><aside className="chat-sidebar"><p className="overline">YOUR CHATS</p>{chats.length ? chats.map(item => { const other = item.participants?.find(p => p._id !== profile._id); return <button key={item._id} className={activeChat === item._id ? 'chat-choice active' : 'chat-choice'} onClick={() => setActiveChat(item._id)}><span className="avatar small-avatar">{other?.username?.slice(0, 1)?.toUpperCase() || 'S'}</span><span><strong>{other?.username || 'Private conversation'}</strong><small>Open conversation</small></span><b>›</b></button> }) : <Empty>No conversations yet.</Empty>}</aside><section className="chat-pane">{current ? <><div className="chat-header"><div><p className="overline">IN A QUIET CORNER</p><h2>{current.participants?.filter(p => p._id !== profile._id).map(p => p.username).join(', ') || 'Conversation'}</h2></div><button className="button quiet small" onClick={remove}>Delete chat</button></div><div className="chat-messages">{messages.length ? messages.map(message => <div className={message.sender?._id === profile._id ? 'chat-bubble mine' : 'chat-bubble'} key={message._id}><p>{message.content}</p><small>{message.sender?.username || 'Member'} · {dateLabel(message.createdAt)}</small></div>) : <Empty>Start with a kind word.</Empty>}</div><form className="chat-compose" onSubmit={send}><input name="content" placeholder="Write a reply…" maxLength="1000" required/><button className="button primary">Send ↗</button></form></> : <div className="chat-placeholder"><span>◌</span><h2>Make space for a conversation.</h2><p>Choose a chat from the list to read and reply.</p></div>}</section></Card></div>
}

function Profile({ api, profile, setProfile, notify, perform }) {
  const save = event => { event.preventDefault(); const data = Object.fromEntries(new FormData(event.currentTarget)); Object.keys(data).forEach(key => !data[key] && delete data[key]); perform(async () => { setProfile(await api('/user', { method: 'PATCH', body: data })); notify('Profile updated.') }) }
  return <div className="page-content"><PageHeading eyebrow="THE DETAILS THAT ARE YOURS" title="Your profile" subtitle="Keep the name and account details on your space up to date."/><Card className="profile-card"><div className="profile-intro"><span className="avatar profile-avatar">{profile.username?.slice(0, 1)?.toUpperCase() || 'S'}</span><div><p className="overline">YOUR ACCOUNT</p><h2>{profile.username}</h2><span className="muted">{profile.email}</span></div></div><form className="form-stack" onSubmit={save}><Field label="Display name" name="username" defaultValue={profile.username || ''} required/><Field label="Phone number" name="phone" defaultValue={profile.phone || ''} type="tel" placeholder="+201000000000"/><Field label="Date of birth" name="DOB" defaultValue={profile.DOB ? new Date(profile.DOB).toISOString().slice(0, 10) : ''} type="date"/><button className="button primary">Save changes ↗</button></form></Card></div>
}

export default App
