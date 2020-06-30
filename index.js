require('dotenv').config()
const express = require('express')
const path = require('path')
const qs = require('querystring')
const fetch = require('node-fetch')
const app = express()
const port = process.env.PORT || 3000;

app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(express.static('public'));
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'ejs')

const HOSTNAME = `http://localhost:${port}`
const getRedirectUri = next => {
  if (next) {
    return `${HOSTNAME}/oauth?${qs.stringify({ next })}`
  }
  return `${HOSTNAME}/oauth`
}
const getAuthorizeLink = next => {
  return `${process.env.FEAT_AUTHORIZE_ENDPOINT}?${qs.stringify({
    client_id: process.env.FEAT_CLIENT_ID,
    response_type: 'code',
    redirect_uri: getRedirectUri(next),
    scopes: 'all'
  })}`
}

const apiFetch = (endpoint, options) => {
  return fetch(`${process.env.FEAT_API_ENDPOINT}${endpoint}`, options).then(
    res => res.json()
  )
}

let token

app.get('/', async (req, res) => {
  if (token) {
    // fetch user basic info
    const { data } = await apiFetch('/api/user/basic-info/', {
      headers: {
        Authorization: `Bearer ${token.access_token}`
      }
    })
    res.render('user-info', {
        userInfo: data,
    })
    return
  }
  res.render('index', {
    login_url: getAuthorizeLink(),
    login_and_redirect: getAuthorizeLink('/profile')
  })
})

app.get('/profile', async(req, res) => {
    if (!token) {
        res.redirect(getAuthorizeLink('/profile'));
        return;
    }
    res.send('TODO Profile Page');
})

app.get('/oauth', (req, res) => {
  const body = {
    // grant_type: 'authorization_code',
    grant_type: 'authorization_code',
    client_id: process.env.FEAT_CLIENT_ID,
    client_secret: process.env.FEAT_CLIENT_SECRET,
    code: req.query.code,
    redirect_uri: getRedirectUri(req.query.next)
  }
  apiFetch(`/api/o/token/`, {
    method: 'POST',
    body: qs.stringify(body),
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  })
    .then(data => {
      token = data
      res.redirect(req.query.next || '/')
    })
    .catch(err => {
      res.send(err.message)
    })
})

app.get('/reset', (req, res) => {
  token = undefined;
  return res.redirect('/');
})

app.listen(port, () =>
  console.log(`Example app listening at http://localhost:${port}`)
)
