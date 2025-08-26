# Marginalia

*The flat-hierarchy annotation platform*

![Banner image of margi-nalia.site](banner.png)

<p align="center">💫✨ <a href="https://margi-nalia.site"><b>LIVE DEMO</b></a> ✨💫</p>

Developed by Senka and Arran.

Support from [Stimulerings Fonds](https://www.stimuleringsfonds.nl/).

## About

Marginalia is an open, collaborative article annotation and publishing platform that enables contributions from collectives and individuals.

Annotations have historically served as a method of assistance for reading dense and difficult texts and have existed in the margins of the “original” or “main” text.
While the concept of marginalia includes not just annotations, but drawings, critiques, illuminations, scribbles and the like.

We think of margins as a space of not often recognised knowledge creation, that is just as important, if not more so, than the main body of text.

This platform foregrounds non-linear, messy, entangled knowledge creation.
It is for those seeking online space for communal learning, wild experiments in reading and writing, and intervening into the text to make room for themselves in it.

*Documentation, tutorials and examples coming soon!*

## To install and run

Requires [node.js](https://nodejs.org/), and [imagemagick](https://imagemagick.org/index.php) (for image conversion).
In a terminal run the following lines:

```bash
cd /somewhere/you/keep/projects/
git clone git@github.com:al165/MarginaliaDemo.git
cd MarginaliaDemo
npm install
npx webpack --config webpage.config.cjs
echo PORT=3001 >> .env
npm start
```

Then navigate to `localhost:3001` in your browser.

If you are running this in production, make sure that websocket connections are allowed by your server!

### Configuration

Create a file named `.env` in the root of the repo with the following content:

```properties
PORT=3001
BASE_URL=/
UPLOADS_DIR=./uploads

ADMIN_USERNAME=admin
ADMIN_PASSWORD=secret123
```

These are the default values.
The key/values are as follows:

- `PORT`: which port to listen on
- `BASE_URL`: is the root path of the URL, e.g. the api to get a room will become `<your_domain.com><BASE_URL>/<roomId>`. Must begin with a `/`, and if it ends in '/' it will be stripped.
- `UPLOADS_DIR`: the destination that uploaded images are saved to and served from. It will be created if it does not already exist. Note that there will also be a `tmp/` folder created in here that is used as a working directory when converting images.
- `ADMIN_USERNAME` and `ADMIN_PASSWORD`: credentials to access `/admin` for adminastrive tools. *Must be set!*
