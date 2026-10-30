export interface ChartData {
  title: string;
  categories: string[];
  groups: string[];
  values: number[][];
}

export interface VocabularyItem {
  term: string;
  meaning: string;
  usage: string;
  example: string;
}

export interface WritingModel {
  title: string;
  prompt: string;
  paragraphs: string[];
  chart?: ChartData;
}

export const task1Models: WritingModel[] = [
  {
    title: "How people travelled to work or college",
    chart: {
      title: "Main travel method in Bayford in 2025",
      categories: ["Car", "Bus", "Bicycle", "Walking"],
      groups: ["Workers", "College students"],
      values: [[45, 35, 10, 10], [20, 45, 25, 10]],
    },
    prompt: "The bar chart compares the percentages of workers and college students in Bayford who used four main methods of travelling to work or college in 2025. Summarise the main features and make relevant comparisons.",
    paragraphs: [
      "The bar chart shows how workers and college students in Bayford travelled to work or college in 2025, with the figures expressed as percentages for four main methods of transport.",
      "Overall, the car was the most common choice among workers, whereas college students were most likely to travel by bus. Cycling was also more popular with students, while walking accounted for the same proportion in both groups.",
      "Among workers, 45% travelled by car, compared with only 20% of students. The difference between the two groups was therefore 25 percentage points. Bus travel showed the opposite pattern: it represented 45% of students but 35% of workers. These were the two largest categories for workers, together accounting for four fifths of that group.",
      "A quarter of students used a bicycle, which was two and a half times the figure for workers, at 10%. Walking was less common than cycling among students, at just 10%. For workers, however, these two methods were equally popular and each accounted for one in ten people.",
    ],
  },
  {
    title: "How different age groups used a library",
    chart: {
      title: "Monthly library activities in Westbridge in 2025",
      categories: ["Borrowing\nbooks", "Reading\nnewspapers", "Using\ncomputers", "Studying"],
      groups: ["Ages 18–29", "Ages 60 and over"],
      values: [[60, 20, 50, 65], [75, 55, 15, 10]],
    },
    prompt: "The bar chart shows the percentages of library members in two age groups who did four activities at least once a month at Westbridge Library in 2025. Members could do more than one activity. Summarise the main features and make relevant comparisons.",
    paragraphs: [
      "The bar chart compares monthly participation in four activities at Westbridge Library in 2025 among members aged 18–29 and those aged 60 and over. Each percentage refers to the members within the relevant age group.",
      "Overall, younger members were more likely to study or use computers, while older members had higher figures for borrowing books and reading newspapers. Studying was the leading activity among the younger group, whereas borrowing books was the most common activity among older members.",
      "Some 65% of younger members studied at the library, compared with just 10% of those aged 60 and over. This was the largest gap between the groups, at 55 percentage points. Computer use showed a similar pattern, with figures of 50% and 15% respectively.",
      "By contrast, three quarters of older members borrowed books, compared with 60% of younger members, a difference of 15 percentage points. Reading newspapers was also more common among the older group: 55% did this at least once a month, while the corresponding figure for younger members was only 20%.",
    ],
  },
];

export const task1Vocabulary: VocabularyItem[] = [
  { term: "accounted for", meaning: "chiếm (một tỷ lệ)", usage: "Dùng để nêu phần trăm hoặc phần của một tổng; theo sau là con số hoặc cụm chỉ tỷ lệ.", example: "Online sales accounted for 38% of total revenue." },
  { term: "proportion", meaning: "tỷ lệ; phần trong tổng thể", usage: "Dùng khi mô tả phần của một nhóm; thường đi với of hoặc cấu trúc the same/a higher proportion.", example: "A higher proportion of younger residents used public transport." },
  { term: "percentage points", meaning: "điểm phần trăm", usage: "Dùng cho chênh lệch tuyệt đối giữa hai tỷ lệ phần trăm, không dùng percent trong trường hợp này.", example: "The figure rose from 30% to 45%, an increase of 15 percentage points." },
  { term: "respectively", meaning: "lần lượt", usage: "Đặt sau một chuỗi số liệu để nối chúng với các đối tượng đã nêu theo cùng thứ tự.", example: "The figures for buses and trains were 42% and 27%, respectively." },
  { term: "By contrast", meaning: "trái lại; ngược lại", usage: "Dùng ở đầu câu để chuyển sang một xu hướng hoặc số liệu đối lập; thường có dấu phẩy theo sau.", example: "Car use fell steadily. By contrast, cycling became more popular." },
  { term: "three quarters", meaning: "ba phần tư (75%)", usage: "Dùng như một cụm danh từ chỉ tỷ lệ; có thể theo sau bởi of + nhóm.", example: "Three quarters of respondents preferred flexible hours." },
  { term: "corresponding figure", meaning: "số liệu tương ứng", usage: "Dùng để tránh lặp lại tên hạng mục khi so sánh cùng một chỉ số giữa hai nhóm hoặc thời điểm.", example: "The corresponding figure for rural areas was only 18%." },
  { term: "leading activity", meaning: "hoạt động phổ biến hàng đầu", usage: "Dùng để chỉ hạng mục có tỷ lệ cao nhất trong một nhóm hoặc giai đoạn.", example: "Swimming was the leading activity among teenagers." },
];

export const task1Practices = [
  {
    title: "Guided writing",
    chart: { title: "Main travel method in Riverford in 2025", categories: ["Car", "Bus", "Bicycle", "Walking"], groups: ["Workers", "College students"], values: [[40, 30, 20, 10], [20, 35, 30, 15]] },
    prompt: "The bar chart compares the percentages of workers and college students in Riverford who used four main methods of travelling to work or college in 2025. Summarise the main features and make relevant comparisons.",
  },
  {
    title: "Independent writing",
    chart: { title: "Monthly community centre activities in Oakton in 2025", categories: ["Fitness\nclasses", "Art\nclasses", "Technology\nworkshops", "Music\nclasses"], groups: ["Ages 18–29", "Ages 60 and over"], values: [[55, 25, 45, 30], [35, 45, 20, 30]] },
    prompt: "The bar chart shows the percentages of community centre members in two age groups who attended four types of activity at least once a month in Oakton in 2025. Members could attend more than one activity. Summarise the main features and make relevant comparisons.",
  },
] satisfies Array<{ title: string; chart: ChartData; prompt: string }>;

export const task2Prompt = "Some people believe that universities should focus mainly on practical skills that prepare students for employment. Others think that a broad academic education is equally important. To what extent do you agree or disagree?";

export const task2Models: WritingModel[] = [
  {
    title: "Model 1: Practical preparation with a broad foundation",
    prompt: task2Prompt,
    paragraphs: [
      "Universities are often expected to help graduates enter the labour market, so it is understandable that many people want courses to emphasise practical skills. I agree that employment preparation should be a central part of higher education; however, it should be built on a broad academic foundation rather than replacing it.",
      "Practical training gives students a smoother transition into work. Engineering students, for example, benefit from using current design software, while business students need opportunities to analyse realistic cases and present recommendations. Such experience allows graduates to demonstrate that they can apply knowledge, collaborate under pressure and meet professional standards. It can also improve employability because companies spend less time teaching basic workplace procedures. For this reason, universities should maintain close links with employers and offer internships, project work and career guidance.",
      "Nevertheless, narrowly vocational programmes can become outdated quickly. Specific software, regulations and business models change, whereas the capacity to evaluate evidence, learn independently and communicate complex ideas remains valuable. A broad education also exposes students to perspectives outside their main subject. A computer science student who studies ethics may make more responsible decisions about personal data, while a future manager who understands history and society may recognise the wider consequences of a commercial decision. These transferable skills help graduates adapt when their first occupation changes or disappears.",
      "In my view, the most effective degree combines both purposes. Universities should teach the concepts and critical habits that support lifelong learning, then give students repeated chances to use them in authentic tasks. Assessment could include research essays alongside team projects designed with local organisations. This balanced approach would not turn universities into short-term training centres, but it would ensure that academic knowledge has a practical application.",
      "In conclusion, I largely agree that universities must prepare students for employment, yet this aim is best achieved through practical experience supported by a broad education. Graduates need immediate competence, but they also need the intellectual flexibility to keep developing throughout their careers.",
    ],
  },
  {
    title: "Model 2: Why broad education deserves equal weight",
    prompt: task2Prompt,
    paragraphs: [
      "The rising cost of university has strengthened the argument that degrees should lead directly to employment. Although practical training is an important responsibility of higher education, I disagree that it should be the main focus. Universities serve students and society better when professional preparation and broad academic study receive equal attention.",
      "There is a clear case for including workplace skills in a degree. Students should know how knowledge in their discipline is used beyond the classroom, and they need experience of deadlines, teamwork and professional communication. A nursing programme cannot rely on theory without supervised clinical practice, just as an architecture course must teach students to develop workable designs. Well-designed placements and applied projects also help students make informed career choices before graduation. Therefore, practical learning should be a substantial and visible part of every relevant programme.",
      "However, making immediate employment the dominant goal would underestimate the long-term value of university. The jobs available when a student enrols may change considerably by the time that person reaches mid-career. Graduates who understand how to question assumptions, assess sources and construct a reasoned argument are better equipped to respond to unfamiliar problems. Breadth matters for society as well. Scientific innovation needs ethical judgement, public policy requires historical understanding, and successful organisations depend on people who can consider viewpoints other than their own. These outcomes are difficult to produce through job-specific instruction alone.",
      "Equal emphasis does not mean filling a timetable with unrelated subjects. Institutions can integrate academic breadth with professional contexts. For instance, data-science students might examine statistics while investigating bias in public datasets, and marketing students could study psychology before designing a responsible campaign. In both cases, students develop usable abilities while also learning to examine the assumptions and consequences behind their decisions. Employers gain adaptable graduates rather than workers trained for only one set of tasks.",
      "To conclude, universities should certainly equip students for work, but practical readiness should not outweigh broad academic development. Giving the two aims equal status produces graduates who can contribute immediately, continue learning and act responsibly when technology and society change.",
    ],
  },
];

export const task2Vocabulary: VocabularyItem[] = [
  { term: "academic foundation", meaning: "nền tảng học thuật", usage: "Dùng để chỉ kiến thức và phương pháp tư duy cơ bản hỗ trợ việc học chuyên sâu hoặc thực hành.", example: "A strong academic foundation helps trainees understand why a procedure works." },
  { term: "smoother transition", meaning: "sự chuyển tiếp thuận lợi hơn", usage: "Thường đi với into/from/to để mô tả việc chuyển giữa hai giai đoạn dễ dàng hơn.", example: "Mentoring creates a smoother transition from university into full-time work." },
  { term: "employability", meaning: "khả năng tìm và duy trì việc làm", usage: "Danh từ không đếm được; thường đi với improve, enhance hoặc skills.", example: "Work placements can improve graduates’ employability." },
  { term: "transferable skills", meaning: "kỹ năng có thể áp dụng ở nhiều công việc", usage: "Dùng cho kỹ năng như giao tiếp, phân tích và làm việc nhóm có giá trị trong nhiều bối cảnh.", example: "Clear communication is one of the most useful transferable skills." },
  { term: "authentic tasks", meaning: "nhiệm vụ sát thực tế", usage: "Dùng để chỉ hoạt động mô phỏng hoặc xuất phát từ tình huống thực, thay vì bài tập rời rạc.", example: "Students applied the theory through authentic tasks from local businesses." },
  { term: "intellectual flexibility", meaning: "sự linh hoạt trong tư duy", usage: "Dùng để mô tả khả năng điều chỉnh cách suy nghĩ khi gặp thông tin hoặc vấn đề mới.", example: "Interdisciplinary study encourages intellectual flexibility." },
  { term: "substantial", meaning: "đáng kể; quan trọng", usage: "Tính từ đứng trước danh từ để nhấn mạnh quy mô hoặc mức độ lớn, nhưng không nhất thiết là phần lớn nhất.", example: "Independent research forms a substantial part of the final year." },
  { term: "question assumptions", meaning: "đặt câu hỏi về các giả định", usage: "Dùng khi người viết kiểm tra điều đang được coi là đúng thay vì chấp nhận ngay.", example: "Good researchers question assumptions before drawing conclusions." },
  { term: "reasoned argument", meaning: "lập luận có lý lẽ", usage: "Dùng cho quan điểm được phát triển bằng lý do và bằng chứng rõ ràng.", example: "The report presents a reasoned argument for expanding public transport." },
  { term: "job-specific", meaning: "chỉ dành cho một công việc cụ thể", usage: "Tính từ ghép đứng trước danh từ như training, knowledge hoặc skills.", example: "Job-specific training may need frequent updates as technology changes." },
];

export const task2IndependentPrompt = "Some people think all university students should complete a period of unpaid community service before graduating. To what extent do you agree or disagree?";
