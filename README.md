# Insomnia REST Client 

[![Insomnia](https://img.shields.io/badge/maintainer-Insomnia-purple.svg?colorB=6e60cc)](https://insomnia.rest)
[![Travis](https://api.travis-ci.org/getinsomnia/insomnia.svg)](https://travis-ci.org/getinsomnia/insomnia)
[![AppVeyor](https://img.shields.io/appveyor/ci/gschier/insomnia.svg)](https://ci.appveyor.com/project/gschier/insomnia)
[![license](https://img.shields.io/github/license/getinsomnia/insomnia.svg)](LICENSE)
[![Slack Channel](https://chat.insomnia.rest/badge.svg)](https://chat.insomnia.rest/)
[![Twitter Follow](https://img.shields.io/twitter/follow/getinsomnia.svg?style=social&label=%40GetInsomnia%20on%20Twitter&style=plastic)](https://twitter.com/getinsomnia)

Insomnia is a cross-platform _REST client_, built on top of [Electron](http://electron.atom.io/).

![Insomnia REST Client Screenshot](https://insomnia.rest/images/docs/promo.png)

## Bugs and Feature Requests

Have a bug or a feature request? First, read the 
[issue guidelines](CONTRIBUTING.md#using-the-issue-tracker) and search for existing and 
closed issues. If your problem or idea is not addressed yet, [please open a new issue](/issues).

For more generic product questions and feedback, join the [Slack Team](https://chat.insomnia.rest) or email 
[support@insomnia.rest](mailto:support@insomnia.rest)

## Contributing

Please read through our [contributing guidelines](CONTRIBUTING.md). Included are directions 
for opening issues, coding standards, and notes on development.

Editor preferences are available in the [editor config](.editorconfig) for easy use in 
common text editors. Read more and download plugins at [editorconfig.org](http://editorconfig.org).

## Developing

Development on Insomnia can be done on Mac, Windows, or Linux as long as you have
[NodeJS 7.4](https://nodejs.org) and [Git](https://git-scm.com/).

```bash
# Install dependencies and build addons for Electron
npm install
npm run rebuild

# Start app
npm run dev

# Run tests
npm test
```

## License

[GNU GPLv3](LICENSE) &copy; [Insomnia](https://insomnia.rest)
