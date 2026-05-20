export type BlogCardImageOverride = {
  imageSrc: string;
  imageAlt: string;
  cardObjectPosition: string;
};

export const blogCardImageOverrides: Record<string, BlogCardImageOverride> = {
  "how-to-choose-the-right-life-partner": {
    imageSrc: "/image-1.jpeg",
    imageAlt: "A smiling couple standing close together",
    cardObjectPosition: "center center",
  },
  "tips-for-a-successful-matrimonial-profile": {
    imageSrc: "/image-2.png",
    imageAlt: "A couple having a warm conversation at home",
    cardObjectPosition: "center center",
  },
  "understanding-compatibility-in-relationships": {
    imageSrc: "/image-3.png",
    imageAlt: "A couple reviewing compatibility details together on a laptop",
    cardObjectPosition: "center center",
  },
  "family-involvement-in-matchmaking": {
    imageSrc: "/image-4.png",
    imageAlt: "Two families meeting warmly during the matchmaking process",
    cardObjectPosition: "center center",
  },
  "things-to-discuss-before-marriage": {
    imageSrc: "/image-5.png",
    imageAlt: "A couple discussing important marriage topics together",
    cardObjectPosition: "center center",
  },
};
