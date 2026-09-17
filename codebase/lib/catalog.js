// Curated entry points only. The model cannot invent or fetch URLs.
export const catalog = [
  {
    id: 'attention', title: 'Attention Is All You Need',
    publisher: 'Vaswani et al. · arXiv',
    url: 'https://arxiv.org/abs/1706.03762',
    selector: 'blockquote.abstract', locator: 'Abstract',
    description: 'Bản tóm tắt công trình gốc giới thiệu Transformer (2017). Không bao gồm toàn bộ bài báo.',
    rights: 'Trích đoạn nghiên cứu để đối chiếu; kiểm tra quyền sử dụng trước khi phân phối.'
  },
  {
    id: 'map', title: 'Array.prototype.map()', publisher: 'MDN Web Docs',
    url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/map',
    selector: 'main p', locator: 'Nội dung tham chiếu / đoạn văn',
    description: 'Tài liệu tham chiếu JavaScript: biến đổi phần tử của mảng.',
    rights: 'MDN content: CC BY-SA 2.5 hoặc phiên bản mới hơn; giữ attribution và xem giấy phép tại nguồn.'
  },
  {
    id: 'filter', title: 'Array.prototype.filter()', publisher: 'MDN Web Docs',
    url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/filter',
    selector: 'main p', locator: 'Nội dung tham chiếu / đoạn văn',
    description: 'Tài liệu tham chiếu JavaScript: lọc phần tử theo điều kiện.',
    rights: 'MDN content: CC BY-SA 2.5 hoặc phiên bản mới hơn; giữ attribution và xem giấy phép tại nguồn.'
  }
];
