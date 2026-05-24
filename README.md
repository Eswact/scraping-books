# web-scraping-books

Kitapyurdu.com'dan kitapları çeken Node.js scraper. Sonuçları `output/books.json` dosyasına kaydeder.

## Kurulum

```bash
npm install
npm start
```

## Çıktı

Her kitap için şu alanlar kaydedilir: `id`, `title`, `author`, `publisher`, `image`, `price`.  
Varsa ek bilgiler `details` altında: `isbn`, `language`, `pageCount`, `publishDate`.

## Notlar

- Sayfalar 5'erli batch'ler halinde çekilir, her batch arasında 250–500ms beklenir.
- Ara sonuçlar her batch sonunda diske yazılır.
