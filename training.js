TfIdf = require("tf-idf-search");
tf_idf = new TfIdf();
const fs = require("fs");

// Ambil dataset
let rawData = fs.readFileSync("./dataset-wisata-semarang.json", "utf-8");
let parseData = JSON.parse(rawData);

// Filter Dataset
const getData = parseData.map(({ content }) => ({
  content,
}));

let documents = getData.map((obj) => obj.content);

let query = "Taman Kota Semarang";

function rankDocuments() {
  let corpus = tf_idf.createCorpusFromStringArray(documents);
  let search_result = tf_idf.rankDocumentsByQuery(query);
  return search_result;
}

// Hasil TF-IDF
let result = rankDocuments(documents, query);
let showSimilarity = result.map(({ index, similarityIndex }) => ({
  index,
  similarityIndex,
}));

// function getIndex() {
//   if ((showSimilarity.similarityIndex <= 0, 1)) {
//     return showSimilarity.index;
//   }
//   return;
// }

console.log(showSimilarity);

// module.exports = { rankDocuments, getIndex };
