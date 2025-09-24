declare module "zxcvbn" {
  type ZXCVBNScore = 0 | 1 | 2 | 3 | 4;

  interface ZXCVBNFeedback {
    warning: string;
    suggestions: string[];
  }

  interface ZXCVBNResult {
    score: ZXCVBNScore;
    feedback: ZXCVBNFeedback;
  }

  export default function zxcvbn(password: string): ZXCVBNResult;
}
