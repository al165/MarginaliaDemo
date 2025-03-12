# Marginalia

*The flat-hierarchy annotation platform*

<p align="center">💫✨ <a href="https://margi-nalia.site"><b>LIVE DEMO</b></a> ✨💫</p>

Developed by Senka and Arran.

Support from [Stimulerings Fonds](https://www.stimuleringsfonds.nl/);

## To install and run

Requires [node.js](https://nodejs.org/), then in a terminal run the following lines:

```bash
cd /somewhere/you/keep/projects/
git clone git@github.com:al165/MarginaliaDemo.git
cd MarginaliaDemo
npm install
echo PORT=3000 >> .env
npm start
```

Then navigate to `localhost:3001` in your browser.

### Configuration

Create a file named `.env` in the root of the repo with the following content:

```properties
PORT=3001
BASE_URL=/
```

These are the default values.
The key/values are as follows:

- `PORT`: which port to listen on
- `BASE_URL`: is the root path of the URL, e.g. the api to get a room will become `<your_domain.com><BASE_URL>/<roomId>`. Must begin with a `/`, and if it ends in '/' it will be stripped.

## Todo

- documentation
- contribution guidelines
- improve accessibility (shortcuts, screen-reader)
- rotation
- image annotation
- other embedded media
- dithered images
- Room settings
