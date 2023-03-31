const { Telegraf } = require("telegraf");
const fs = require("fs");
require("dotenv").config();

TfIdf = require("tf-idf-search");
tf_idf = new TfIdf();

const TOKEN = process.env.TELEGRAM_API_KEY;

const bot = new Telegraf(TOKEN);

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
        [
          { text: "\u{1F9ED} Cari Destinasi", callback_data: "content" },
          // { text: "Input Text", callback_data: "testtext" },
        ],
        [{ text: "\u{1F4DA} Semua Destinasi", callback_data: "all-data" }],
      ],
    },
  });
});

let parseData = JSON.parse(fs.readFileSync("./dataset-wisata-semarang.json", "utf-8"));
const getData = parseData.map(({ content }) => ({
  content,
}));

const finalData = parseData.map(({ title, placeUrl }) => ({
  title,
  placeUrl,
}));
let documents = getData.map((obj) => obj.content);

bot.command("cari", (ctx) => {
  let infDestinasi = ctx.message.text;
  let inputDestinasi = infDestinasi.split(" ");
  let query = "";

  if (inputDestinasi.length === 1) {
    ctx.reply("Silahkan masukkan informasi yang ingin dicari!");
  } else {
    inputDestinasi.shift();
    query = inputDestinasi.join(" ");

    function rankDocuments() {
      let corpus = tf_idf.createCorpusFromStringArray(documents);
      let search_result = tf_idf.rankDocumentsByQuery(query);
      return search_result;
    }

    let recommendation = rankDocuments(documents, query);

    let showSimilarity = recommendation
      .map(({ index, similarityIndex }) => ({
        index,
        similarityIndex,
      }))
      .filter((item) => item.similarityIndex >= 0.1);

    let recMsg = `Rekomendasi berdasarkan pencarian Anda:\n`;
    showSimilarity.forEach((items) => {
      const data = finalData[items.index];

      if (data) {
        recMsg += `\u27a2 [${data.title}](${data.placeUrl})\n`;
        console.log(data.title);
      } else {
        console.log(`Invalid Data at index ${items.index}`);
      }
    });

    ctx.reply(recMsg, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [[{ text: "Cari lagi", callback_data: "content" }]],
      },
    });

    console.log(showSimilarity);
  }
});

bot.action("content", (ctx) => {
  ctx.answerCbQuery("Loading...");

  let message = `Silahkan cari informasi destinasi wisata Kota Semarang menggunakan perintah /cari <nama_wisata>\nContoh: /cari Masjid Agung Jawa Tengah`;
  ctx.reply(message);
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

bot.action("all-data", (ctx) => {
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
          { text: `\u23ED Selanjutnya`, callback_data: "nextData" },
          { text: `\ud83c\udf10 Google Maps`, url: `${wisata.placeUrl}` },
        ],
      ],
    },
    parse_mode: "Markdown",
  });

  bot.action("nextData", (ctx) => {
    currIdx++;
    if (currIdx >= parameterData.length) {
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
              { text: `\u23ED Selanjutnya`, callback_data: "nextData" },
              { text: `\ud83c\udf10 Google Maps`, url: `${wisata.placeUrl}` },
            ],
          ],
        },
      }
    );
  });
});

bot.launch();

bot.action("testtext", (ctx) => {
  ctx.answerCbQuery("Loading...");
  let startMsg = `Input text using /input <text>`;
  ctx.reply(startMsg);

  bot.command("input", (ctx) => {
    let message = ctx.message.text;
    let inputMessage = message.split(" ");
    let messageAnswer = "";

    if (inputMessage.length === 1) {
      messageAnswer = "Plese input the text";
      ctx.reply(messageAnswer);
    } else {
      inputMessage.shift();
      messageAnswer = inputMessage.join(" ");
    }

    let answer = `You said ${messageAnswer}`;

    ctx.reply(answer, {
      reply_markup: {
        inline_keyboard: [[{ text: "Input Again", callback_data: "testtext" }]],
      },
    });
  });
});
