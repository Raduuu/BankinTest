const express = require('express')
const app = express()
const fs = require('fs')
const jwt = require('jsonwebtoken')
const axios = require('axios')

const client_id = 'v3Jiber-nXC25tJXW6pKPrguCVlwsYsMxgcKZHmFTqE'

async function generateJWT() {
    let jwtValue = ''

    try {
        const payload = {
            // Issuer for JWT, should be derived from your redirect URL
            iss: '127.0.0.1',
            // Your client ID,
            sub: client_id,
            // Constant
            aud: 'https://revolut.com',
        }
        const privateKeyName = 'privatekey.pem'

        const privateKey = fs.readFileSync(privateKeyName)

        jwtValue = jwt.sign(payload, privateKey, { algorithm: 'RS256', expiresIn: 60 * 60 * 60 })
    } catch (error) {
        console.error('Got error on generate JWT', error)
    }
    return jwtValue
}

async function auth(req, res) {
    let response
    let accounts

    const { code } = req.query
    try {
        const jwt = await generateJWT().then((data) => data)
        const body = `grant_type=authorization_code&client_id=${client_id}&code=${code}&client_assertion_type=urn:ietf:params:oauth:client-assertion-type:jwt-bearer&client_assertion=${jwt}`

        response = await axios
            .post('https://sandbox-b2b.revolut.com/api/1.0/auth/token', body)
            .then((data) => data.data)
            .catch((err) => console.error(err))
        const access_token = response.access_token
        const refresh_token = response.refresh_token

        const options = {
            headers: { Authorization: `Bearer ${access_token}` },
        }
        accounts = await axios
            .get('https://sandbox-b2b.revolut.com/api/1.0/accounts', options)
            .then((data) => data.data)
            .catch((err) => console.error(err))
    } catch (e) {
        console.error(e)
    }
    res.send(accounts)
}

app.use('/auth', auth)

app.get('/', (req, res) => {
    const url = `https://sandbox-business.revolut.com/app-confirm?client_id=${client_id}&redirect_uri=http://127.0.0.1:8000/auth&response_type=code`
    res.redirect(url)
})

app.listen(8000, () => {
    console.log('Success!')
})
