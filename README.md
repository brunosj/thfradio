![THF Radio logo](https://cms.thfradio.com/uploads/thfradio_seo_5932df4159.jpg)

## Description

This repo contains the website of [THF Radio](https://thfradio.de), a community radio based at the gatehouse of the former Tempelhof Airport in Berlin.

## Technologies

The site is a [Next.js](https://nextjs.org/) project (App Router) deployed on [Vercel](https://vercel.com/). It sources data from [Strapi](https://strapi.io/) and uses [Tailwind CSS](https://tailwindcss.com) for styling. The site is bilingual (English and German), with `next-intl` handling localization and translations. It features automated individual show page generation, an automated schedule (fetched from a Teamup calendar RSS feed), and Discord chat integration.

## Installation

1. Use the git CLI to close the repo

```
gh repo clone brunosj/thfradio
```

2. Install dependencies

```bash
pnpm install
# or
yarn install
```

3. Navigate into the site's directory and start the development server

```bash
pnpm dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Structure

```
.
├── node_modules
├── public
    ├── locales
└── src
    ├── api
    ├── common
    ├── hooks
    ├── modules
    ├── pages
    ├── styles
    ├── types
    ├── utils
├── .eslintrc.json
├── .gitignore
├── next-i18next.config.js
├── next-config.js
├── pnpm-lock.yaml
├── package.json
├── postcss.config.js
├── README.md
├── tailwind.config.js
└── tsconfig.json


```

## Further development

This repository is maintained by [brunosj](https://github.com/brunosj).
