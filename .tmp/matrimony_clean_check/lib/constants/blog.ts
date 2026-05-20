export type BlogPostSection = {
  title: string;
  description: string;
};

export type BlogPost = {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  readTime: string;
  publishedAt: string;
  author: string;
  imageSrc: string;
  imageAlt: string;
  cardObjectPosition: string;
  heroObjectPosition: string;
  introduction: string;
  sections: BlogPostSection[];
  finalThought: string;
};

export const blogCategories = [
  "Relationships",
  "Marriage Tips",
  "Success Stories",
  "Guides",
  "Events",
];

export const blogPosts: BlogPost[] = [
  {
    slug: "how-to-choose-the-right-life-partner",
    title: "How to Choose the Right Life Partner",
    excerpt:
      "Finding the right life partner is one of the most important decisions of your life. Here are some thoughtful ways to choose with clarity and confidence.",
    category: "Relationships",
    readTime: "5 min read",
    publishedAt: "2024-05-28",
    author: "Vivah Bandhan Team",
    imageSrc: "/main.jpeg",
    imageAlt: "A smiling couple standing close together",
    cardObjectPosition: "88% center",
    heroObjectPosition: "74% center",
    introduction:
      "Choosing a life partner is not just about love, but also about compatibility, understanding, and shared values. Take your time, know the person well, and make a decision that supports a happy future together.",
    sections: [
      {
        title: "Know Yourself First",
        description:
          "Understand your values, goals, expectations, and needs. When you know yourself better, you can choose someone who truly matches your life vision.",
      },
      {
        title: "Look for Compatible Values",
        description:
          "Shared values create a strong foundation. Make sure you and your partner agree on important things like family, career, lifestyle, and future goals.",
      },
      {
        title: "Effective Communication",
        description:
          "A successful relationship depends on open and honest communication. Be with someone who listens, understands, and respects your thoughts.",
      },
      {
        title: "Trust and Respect",
        description:
          "Trust and respect are the pillars of any strong relationship. Make sure your partner respects who you are and you can trust them completely.",
      },
      {
        title: "Emotional Compatibility",
        description:
          "Emotional connection matters as much as physical attraction. Ensure you both understand and support each other emotionally.",
      },
      {
        title: "Family Compatibility",
        description:
          "Since you are not just marrying a person but also joining a family, make sure you feel comfortable with their family values and dynamics.",
      },
      {
        title: "Take Your Time",
        description:
          "Do not rush the decision. Spend time together in different situations and notice how both of you handle challenges, responsibilities, and differences.",
      },
    ],
    finalThought:
      "The right life partner is someone who brings out the best in you, supports your journey, and walks with you through every stage of life.",
  },
  {
    slug: "tips-for-a-successful-matrimonial-profile",
    title: "Tips for a Successful Matrimonial Profile",
    excerpt:
      "A well-crafted matrimonial profile helps the right people notice you faster. These simple tips can make your profile feel genuine, warm, and trustworthy.",
    category: "Marriage Tips",
    readTime: "5 min read",
    publishedAt: "2024-05-18",
    author: "Vivah Bandhan Team",
    imageSrc: "/main.jpeg",
    imageAlt: "A couple smiling while looking at each other",
    cardObjectPosition: "82% center",
    heroObjectPosition: "70% center",
    introduction:
      "Your matrimonial profile is often the first introduction someone has to you. A thoughtful profile increases trust, improves response quality, and makes it easier for families to understand what matters to you.",
    sections: [
      {
        title: "Use Clear and Recent Photos",
        description:
          "Choose photos with good lighting and a natural expression. Avoid heavy filters so your profile feels honest and approachable.",
      },
      {
        title: "Write a Genuine Introduction",
        description:
          "Share who you are in a simple, respectful voice. Mention your personality, values, interests, and what kind of relationship you are seeking.",
      },
      {
        title: "Be Specific About Preferences",
        description:
          "Mention the qualities that matter most to you without sounding rigid. Specific details help attract more compatible matches.",
      },
      {
        title: "Highlight Family and Lifestyle",
        description:
          "Families often want a quick sense of your background and routine. Briefly covering your family values, career, and lifestyle adds clarity.",
      },
      {
        title: "Keep It Positive and Updated",
        description:
          "Focus on what you are looking for instead of listing what you dislike. Revisit your profile regularly so it stays current and complete.",
      },
    ],
    finalThought:
      "A strong profile does not try to impress everyone. It helps the right people understand you clearly and respond with confidence.",
  },
  {
    slug: "understanding-compatibility-in-relationships",
    title: "Understanding Compatibility in Relationships",
    excerpt:
      "Compatibility goes far beyond having similar hobbies. It is about how two people think, communicate, and grow together over time.",
    category: "Guides",
    readTime: "4 min read",
    publishedAt: "2024-05-12",
    author: "Vivah Bandhan Team",
    imageSrc: "/main.jpeg",
    imageAlt: "A couple standing together in traditional attire",
    cardObjectPosition: "78% center",
    heroObjectPosition: "66% center",
    introduction:
      "Many people think compatibility means liking the same music or food, but long-term compatibility is deeper. It shows up in values, communication, expectations, emotional habits, and the ability to solve problems as a team.",
    sections: [
      {
        title: "Shared Core Values",
        description:
          "Compatibility starts with alignment in the areas that shape daily life, such as family priorities, honesty, financial habits, and long-term goals.",
      },
      {
        title: "Emotional Pace",
        description:
          "Notice how both of you express affection, process conflict, and seek reassurance. Emotional rhythms do not need to be identical, but they should feel manageable together.",
      },
      {
        title: "Conflict Resolution Style",
        description:
          "Every couple will disagree. Healthy compatibility means both partners can talk through issues without disrespect, silence, or unnecessary drama.",
      },
      {
        title: "Life Vision",
        description:
          "Discuss the future early, including career plans, city preferences, children, family responsibilities, and lifestyle expectations.",
      },
      {
        title: "Willingness to Grow",
        description:
          "Strong compatibility is not perfection. It is the shared willingness to learn, adjust, and support one another as life changes.",
      },
    ],
    finalThought:
      "Compatibility is not about never having differences. It is about handling those differences with maturity, care, and teamwork.",
  },
  {
    slug: "family-involvement-in-matchmaking",
    title: "Family Involvement in Matchmaking",
    excerpt:
      "Families often play an important role in Indian matchmaking. The key is finding a balance between support, guidance, and the couple's own voice.",
    category: "Success Stories",
    readTime: "6 min read",
    publishedAt: "2024-05-10",
    author: "Vivah Bandhan Team",
    imageSrc: "/main.jpeg",
    imageAlt: "Families supporting a couple during the matchmaking process",
    cardObjectPosition: "74% center",
    heroObjectPosition: "63% center",
    introduction:
      "Family involvement can make matchmaking more thoughtful and secure, especially when values, traditions, and long-term stability matter deeply. The healthiest process gives families space to guide without taking away the couple's ability to decide.",
    sections: [
      {
        title: "Clarify Roles Early",
        description:
          "Discuss who will handle introductions, profile screening, and conversations so the process feels coordinated instead of overwhelming.",
      },
      {
        title: "Respect Individual Choice",
        description:
          "Family input is valuable, but the final decision should belong to the two people building the marriage. Support works best when it does not become pressure.",
      },
      {
        title: "Encourage Open Discussion",
        description:
          "Create space for honest conversations about expectations, boundaries, and comfort levels. Small misunderstandings are easier to solve when addressed early.",
      },
      {
        title: "Focus on Values, Not Only Checklists",
        description:
          "Families often begin with practical filters, but deeper conversations about character, communication, and mutual respect are just as important.",
      },
      {
        title: "Keep the Process Dignified",
        description:
          "Whether a match moves forward or not, respectful communication preserves trust and reflects well on everyone involved.",
      },
    ],
    finalThought:
      "Family involvement works best when it protects the process, adds wisdom, and still leaves room for a genuine connection to grow.",
  },
  {
    slug: "things-to-discuss-before-marriage",
    title: "Things to Discuss Before Marriage",
    excerpt:
      "Good pre-marriage conversations reduce future misunderstandings. These topics help couples build clarity before they commit for life.",
    category: "Events",
    readTime: "5 min read",
    publishedAt: "2024-05-08",
    author: "Vivah Bandhan Team",
    imageSrc: "/main.jpeg",
    imageAlt: "A couple having a thoughtful conversation before marriage",
    cardObjectPosition: "70% center",
    heroObjectPosition: "60% center",
    introduction:
      "Marriage is easier to build when important conversations happen early. Talking openly about expectations does not create distance. It creates trust, confidence, and a clearer understanding of the future you want together.",
    sections: [
      {
        title: "Career and Daily Routine",
        description:
          "Talk about work priorities, schedules, travel, and how both of you imagine balancing home and career responsibilities.",
      },
      {
        title: "Money Matters",
        description:
          "Discuss saving habits, spending style, financial goals, family responsibilities, and how major decisions will be handled together.",
      },
      {
        title: "Living Arrangements",
        description:
          "Be clear about where you want to live, whether you expect a joint or nuclear family setup, and how flexible you are on location.",
      },
      {
        title: "Children and Parenting Values",
        description:
          "It helps to understand each other's thoughts on children, timelines, parenting roles, and education priorities before marriage.",
      },
      {
        title: "Boundaries and Expectations",
        description:
          "Talk about communication habits, privacy, family involvement, traditions, and the kind of emotional support both of you expect in marriage.",
      },
    ],
    finalThought:
      "The strongest relationships are not built on guessing. They are built on honest conversations held with patience, empathy, and respect.",
  },
];

export function getBlogPostBySlug(slug: string) {
  return blogPosts.find((post) => post.slug === slug);
}

export function getRelatedBlogPosts(slug: string, limit = 4) {
  return blogPosts.filter((post) => post.slug !== slug).slice(0, limit);
}

export function formatBlogDate(date: string) {
  return new Intl.DateTimeFormat("en-IN", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}
