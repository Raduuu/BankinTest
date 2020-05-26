const express = require('express')
const app = express()
const fs = require('fs')
const jwt = require('jsonwebtoken')
const axios = require('axios')
const open = require('open')

const client_id = 'v3Jiber-nXC25tJXW6pKPrguCVlwsYsMxgcKZHmFTqE'
const refresh_token = 'oa_sand_v0bXfS86DLVb2NzAgxBITJd2KYVMZ2xB0A-xXjJDTII'

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

async function getAccounts(access_token) {
    try {
        const options = {
            headers: { Authorization: `Bearer ${access_token}` },
        }
        accounts = await axios
            .get('https://sandbox-b2b.revolut.com/api/1.0/accounts', options)
            .then((data) => data.data)
            .catch((err) => false)
    } catch (error) {
        console.error('error on getting accounts')
        return false
    }
    return accounts
}

async function auth(req, res) {
    let response
    let newAccessToken
    let accounts

    const { code } = req.query
    try {
        const jwt = await generateJWT().then((data) => data)
        const body = `grant_type=authorization_code&client_id=${client_id}&code=${code}&client_assertion_type=urn:ietf:params:oauth:client-assertion-type:jwt-bearer&client_assertion=${jwt}`

        response = await axios
            .post('https://sandbox-b2b.revolut.com/api/1.0/auth/token', body)
            .then((data) => data.data)
            .catch((err) => console.error(err))
        let access_token = response.access_token
        const refresh_token = response.refresh_token

        console.log('refresh_token', refresh_token)

        // if the access token expired, the getAccounts function will return false
        accounts = await getAccounts(access_token)

        // if it's false, then I get a new access_token
        if (accounts === false) {
            const refresh_body = `grant_type=refresh_token&refresh_token=${refresh_token}&client_assertion_type=urn:ietf:params:oauth:client-assertion-type:jwt-bearer&client_assertion=${jwt}`

            access_token = await axios
                .post('https://sandbox-b2b.revolut.com/api/1.0/auth/token', refresh_body)
                .then((data) => data.data.access_token)
                .catch((err) => console.error(err))

            accounts = await getAccounts(access_token)
        }
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
    // await open('http://127.0.0.1:8000')

    console.log('Success!')
})
