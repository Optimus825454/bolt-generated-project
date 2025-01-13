const express = require('express');
    const cors = require('cors');
    const mysql = require('mysql2');
    const axios = require('axios');
    const cheerio = require('cheerio');

    const app = express();
    app.use(cors());

    const db = mysql.createConnection({
      host: 'localhost',
      user: 'bborsa',
      password: '518518',
      database: 'hisse_update'
    });

    db.connect((err) => {
      if (err) {
        console.error('Veritabanı bağlantı hatası:', err);
        return;
      }
      console.log('Veritabanına bağlandı.');
    });

    app.get('/api/update', async (req, res) => {
      try {
        const response = await axios.get('https://www.isyatirim.com.tr/tr-tr/analiz/hisse/Sayfalar/default.aspx');
        const $ = cheerio.load(response.data);
        const symbols = [];

        $('table.table-responsive tbody tr td:nth-child(1) a').each((i, el) => {
          symbols.push($(el).text().trim() + '.IS');
        });

        const createTableQuery = `
          CREATE TABLE IF NOT EXISTS semptoms (
            id INT AUTO_INCREMENT PRIMARY KEY,
            shortname VARCHAR(255),
            longname VARCHAR(255),
            isactive TINYINT(1)
          )
        `;

        db.query(createTableQuery, (err) => {
          if (err) {
            console.error('Tablo oluşturma hatası:', err);
            res.status(500).send('Tablo oluşturma hatası');
            return;
          }
          console.log('Semptoms tablosu oluşturuldu.');
        });

        for (const symbol of symbols) {
          try {
            const yahooResponse = await axios.get(`https://query1.finance.yahoo.com/v1/finance/search?q=${symbol}`);
            if (yahooResponse.data && yahooResponse.data.quotes && yahooResponse.data.quotes.length > 0) {
              const quote = yahooResponse.data.quotes[0];
              const insertQuery = `
                INSERT INTO semptoms (shortname, longname, isactive)
                VALUES (?, ?, 1)
                ON DUPLICATE KEY UPDATE shortname = ?, longname = ?, isactive = 1
              `;
              db.query(insertQuery, [quote.symbol, quote.longname, quote.symbol, quote.longname], (err) => {
                if (err) {
                  console.error('Veritabanı güncelleme hatası:', err);
                } else {
                  console.log(`${symbol} için veriler güncellendi.`);
                }
              });
            } else {
              const insertQuery = `
                INSERT INTO semptoms (shortname, longname, isactive)
                VALUES (?, '', 0)
                ON DUPLICATE KEY UPDATE isactive = 0
              `;
              db.query(insertQuery, [symbol], (err) => {
                if (err) {
                  console.error('Veritabanı güncelleme hatası:', err);
                } else {
                  console.log(`${symbol} için veri bulunamadı.`);
                }
              });
            }
          } catch (yahooError) {
            console.error('Yahoo Finance API hatası:', yahooError);
            const insertQuery = `
              INSERT INTO semptoms (shortname, longname, isactive)
              VALUES (?, '', 0)
              ON DUPLICATE KEY UPDATE isactive = 0
            `;
            db.query(insertQuery, [symbol], (err) => {
              if (err) {
                console.error('Veritabanı güncelleme hatası:', err);
              } else {
                console.log(`${symbol} için veri bulunamadı.`);
              }
            });
          }
        }
        res.send('Veriler başarıyla güncellendi.');
      } catch (error) {
        console.error('Scraping veya genel hata:', error);
        res.status(500).send('Veri güncelleme hatası');
      }
    });

    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`Sunucu ${PORT} portunda çalışıyor.`);
    });
