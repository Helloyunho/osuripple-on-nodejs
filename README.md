# osuripple-on-nodejs

## WARNING!! This project isn't completed! if you wanna fix errors or update, PRs are okay.

[![standard-readme compliant](https://img.shields.io/badge/standard--readme-OK-green.svg?style=flat-square)](https://github.com/RichardLitt/standard-readme)

> Run osuripple on nodejs!!

## Table of Contents

- [Requirements](#requirements)
- [Usage](#usage)
- [How to connect](#how-to-connect)
- [Maintainers](#maintainers)
- [Contribute](#contribute)
- [License](#license)

## Requirements

```
node.js >= 8
redis
nginx (Or other HTTP Server that has reverse proxy and ssl)
openssl
c++ build tool (if your on windows, install vs build tool v140 and your on linux, install make and gcc and your on macos, install xcode)
python 2.x.x
brain power
hand simulator
thinking
```

## Usage

1. Import .sql file to osu.db (`sqlite3 osu.db '.read schema.sql'`).
2. Add new row on table `users` and edit it to your awesome account!
3. Add new row on table `user_status`.
4. Change the file name `config.sample.json` to `config.json` and change the inside to your setting.
5. Type `node bancho.js` and `node site_emu.js` to run the server. (You must running both at same time)
6. Create a self-signed SSL certificate, This is most important thing 'cause if you skip this part, you can't log in to your osu server. [I think this article is helpful](https://www.akadia.com/services/ssh_test_certificate.html) But... when you type 'Common Name', you must type it to '*.ppy.sh'.
7. Config your http server(c.ppy.sh and c1.ppy.sh must set reverse proxy ip to ip:5001, and osu.ppy.sh set reverse proxy ip to ip:5002) and done!

## How to connect

Change your hosts file to like this:
```
osu.ppy.sh 127.0.0.1 # Or your osu server IP
c.ppy.sh 127.0.0.1 # Or your osu server IP
c1.ppy.sh 127.0.0.1 # Or your osu server IP
```

And install the certificate that you just generated(not the .key file!), [I think this article is helpful](https://community.spiceworks.com/how_to/1839-installing-self-signed-ca-certificate-in-windows)

And just run osu and play!

## Maintainers

[@Helloyunho](https://github.com/Helloyunho)

## Contribute

PRs accepted.

Small note: If editing the README, please conform to the [standard-readme](https://github.com/RichardLitt/standard-readme) specification.

### Contributors

None :(

## License

MIT © 2018 Helloyunho
