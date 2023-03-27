const { Telegraf } = require("telegraf");
const fs = require("fs");
const ContentBasedRecommender = require("content-based-recommender");

const recommender = new ContentBasedRecommender({
  minScore: 0.1,
  maxSimilarDocuments: 100,
});

const TOKEN = "5863871824:AAFwOrT4TSAob0v-wTQUl41g277lG2KamFQ";

const bot = new Telegraf(TOKEN);

const axios = require("axios");

const startMessage = `
    Selamat Datang di Bot Wisata Semarang\nSilahkan Pilih Opsi
`;

bot.start((ctx) => {
  ctx.reply(startMessage, {
    reply_markup: {
      inline_keyboard: [
        [
          { text: "\uD83D\uDD0D Cari Kategori", callback_data: "categori" },
          { text: `\u2B50 Populer`, callback_data: "populer" },
        ],
        [{ text: "Contents", callback_data: "content" }],
      ],
    },
  });
});

bot.action("content", (ctx) => {
  ctx.answerCbQuery("Loading...");

  let rawData = fs.readFileSync("./dataset-wisata-semarang.json", "utf-8");
  let parseData = JSON.parse(rawData);

  const parameterData = parseData.map(
    ({ id, placeUrl, title, rating, reviewCount, imgUrl, category, content }) => ({
      id,
      placeUrl,
      title,
      content,
      rating: rating ?? "Tidak ada rating",
      reviewCount: reviewCount ?? "Tidak ada review",
      imgUrl: imgUrl ?? "https://www.contentviewspro.com/wp-content/uploads/2017/07/default_image.png",
      category: category ?? "Tidak Ada Kategori",
    })
  );

  recommender.train(parameterData);

  const similarData = recommender.getSimilarDocuments("10", 0, 10);

  console.log(similarData);
});

bot.action("categori", async (ctx) => {
  ctx.answerCbQuery("Loading...");

  let rawData = fs.readFileSync("./dataset-wisata-semarang.json", "utf-8");
  let parseData = JSON.parse(rawData);

  const parameterData = parseData.map(
    ({ placeUrl, title, rating, reviewCount, imgUrl, category, content }) => ({
      placeUrl,
      title,
      content,
      rating: rating ?? "Tidak ada rating",
      reviewCount: reviewCount ?? "Tidak ada review",
      imgUrl: imgUrl ?? "https://www.contentviewspro.com/wp-content/uploads/2017/07/default_image.png",
      category: category ?? "Tidak Ada Kategori",
    })
  );

  const uniqueCategory = [...new Set(parameterData.map((items) => items.category).filter(Boolean))];

  let catMsg = `Silahkan tulis kategori destinasi wisata yang anda inginkan menggunakan format:\n/kategori <Jenis Kategori>\nContoh: ( /kategori Taman )\nBerikut Daftar Kategori yang bisa anda tulis:\n`;
  uniqueCategory.forEach((newCategory) => {
    catMsg += `\u27a2 ${newCategory}\n`;
  });
  ctx.reply(catMsg);

  bot.command("kategori", (ctx) => {
    let answer = ctx.message.text;
    let inputAnswer = answer.split(" ");
    let messageAnswer = "";

    if (inputAnswer.length === 1) {
      messageAnswer = "Format Perintah Salah!";
      ctx.reply("Format Perintah Salah!");
    } else {
      inputAnswer.shift();
      messageAnswer = inputAnswer.join(" ");
      let result = parameterData.filter((item) => item.category === messageAnswer);
      if (result.length === 0) {
        messageAnswer = `Tidak ada kategori untuk ${messageAnswer}`;
        ctx.reply(messageAnswer);
      } else {
        let finalResult = result;
        console.log(finalResult);
        let msg = `*Rekomendasi Destinasi Wisata berdasarkan kategori yang Anda cari :*\n`;
        let currIdx = 0;
        const wisata = finalResult[currIdx];
        const photoUrl = wisata.imgUrl;
        const caption = `${msg}\n\n*${wisata.title}*\n\u2B50 Ratings: ${wisata.rating}\n\uD83D\uDCCA Reviews: ${wisata.reviewCount}\n\u{1F3F7} Kategori: ${wisata.category}\n\n${wisata.content}`;

        ctx.replyWithPhoto(photoUrl, {
          caption: caption,
          reply_markup: {
            inline_keyboard: [
              [
                { text: `\u23ED Selanjutnya`, callback_data: "nextRec" },
                { text: `\ud83c\udf10 Google Maps`, url: `${wisata.placeUrl}` },
              ],
            ],
          },
          parse_mode: "Markdown",
        });

        bot.action("nextRec", async (ctx) => {
          currIdx++;
          if (currIdx >= finalResult.length) {
            currIdx = 0;
          }

          const wisata = finalResult[currIdx];
          const photoUrl = wisata.imgUrl;
          const caption = `${msg}\n\n*${wisata.title}*\n\u2B50 Ratings: ${wisata.rating}\n\uD83D\uDCCA Reviews: ${wisata.reviewCount}\n\u{1F3F7} Kategori: ${wisata.category}\n\n${wisata.content}`;

          await ctx.editMessageMedia(
            { type: "photo", media: photoUrl, caption: caption, parse_mode: "Markdown" },
            {
              reply_markup: {
                inline_keyboard: [
                  [
                    { text: `\u23ED Selanjutnya`, callback_data: "nextRec" },
                    { text: `\ud83c\udf10 Google Maps`, url: `${wisata.placeUrl}` },
                  ],
                ],
              },
            }
          );
        });
      }
    }
  });
});

bot.action("populer", async (ctx) => {
  ctx.answerCbQuery("Merekomendasikan...");

  let rawData = fs.readFileSync("./dataset-wisata-semarang.json", "utf-8");
  let parseData = JSON.parse(rawData);

  const parameterData = parseData.map(
    ({ placeUrl, title, rating, reviewCount, imgUrl, category, content }) => ({
      placeUrl,
      title,
      content,
      rating: rating ?? "Tidak ada rating",
      reviewCount: reviewCount ?? "Tidak ada review",
      imgUrl: imgUrl ?? "https://www.contentviewspro.com/wp-content/uploads/2017/07/default_image.png",
      category: category ?? "Tidak Ada Kategori",
    })
  );

  const popularData = parameterData.sort((a, b) => b.reviewCount - a.reviewCount);

  let currIdx = 0;

  const wisata = popularData[currIdx];
  const photoUrl = wisata.imgUrl;
  const caption = `*${wisata.title}*\n\u2B50 Ratings: ${wisata.rating}\n\uD83D\uDCCA Reviews: ${wisata.reviewCount}\n\u{1F3F7} Kategori: ${wisata.category}\n\n${wisata.content}`;

  ctx.replyWithPhoto(photoUrl, {
    caption: caption,
    reply_markup: {
      inline_keyboard: [
        [
          { text: `\u23ED Selanjutnya`, callback_data: "next" },
          { text: `\ud83c\udf10 Google Maps`, url: `${wisata.placeUrl}` },
        ],
      ],
    },
    parse_mode: "Markdown",
  });

  setTimeout(() => {
    let msg = `*Anda Mungkin juga akan menyukai ini :*\n`;
    parameterData.slice(11, 21).forEach((newParams) => {
      msg += `\u27a2 [${newParams.title}](${newParams.placeUrl})\n`;
    });
    ctx.reply(msg, { parse_mode: "Markdown" });
  }, 2000);

  bot.action("next", (ctx) => {
    currIdx++;
    if (currIdx >= 10) {
      currIdx = 0;
    }

    const wisata = parameterData[currIdx];
    const photoUrl = wisata.imgUrl;
    const caption = `*${wisata.title}*\n\u2B50 Ratings: ${wisata.rating}\n\uD83D\uDCCA Reviews: ${wisata.reviewCount}\n\u{1F3F7} Kategori: ${wisata.category}\n\n${wisata.content}`;

    ctx.editMessageMedia(
      { type: "photo", media: photoUrl, caption: caption, parse_mode: "Markdown" },
      {
        reply_markup: {
          inline_keyboard: [
            [
              { text: `\u23ED Selanjutnya`, callback_data: "next" },
              { text: `\ud83c\udf10 Google Maps`, url: `${wisata.placeUrl}` },
            ],
          ],
        },
      }
    );
  });
});

bot.launch();
