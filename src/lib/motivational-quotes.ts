export type MotivationalQuote = {
  text: string;
  author: string;
};

/** Curated from https://www.futurefit.co.uk/blog/gym-motivational-quotes/ */
export const MOTIVATIONAL_QUOTES: MotivationalQuote[] = [
  {
    text: "I hated every minute of training, but I said, 'Don't quit. Suffer now and live the rest of your life as a champion.'",
    author: "Muhammad Ali",
  },
  {
    text: "We are what we repeatedly do. Excellence then is not an act but a habit.",
    author: "Aristotle",
  },
  {
    text: "The body achieves what the mind believes.",
    author: "Napoleon Hill",
  },
  {
    text: "If you don't find the time, if you don't do the work, you don't get the results.",
    author: "Arnold Schwarzenegger",
  },
  {
    text: "Push harder than yesterday if you want a different tomorrow.",
    author: "Vincent Williams Sr.",
  },
  {
    text: "The real workout starts when you want to stop.",
    author: "Ronnie Coleman",
  },
  {
    text: "Take care of your body. It's the only place you have to live.",
    author: "Jim Rohn",
  },
  {
    text: "I've failed over and over again in my life and that is why I succeed.",
    author: "Michael Jordan",
  },
  {
    text: "The secret of getting ahead is getting started.",
    author: "Mark Twain",
  },
  {
    text: "You miss one hundred percent of the shots you don't take.",
    author: "Wayne Gretzky",
  },
  {
    text: "If something stands between you and your success, move it. Never be denied.",
    author: "Dwayne “The Rock” Johnson",
  },
  {
    text: "All progress takes place outside the comfort zone.",
    author: "Michael John Bobak",
  },
  {
    text: "Just believe in yourself. Even if you don't, just pretend that you do and at some point, you will.",
    author: "Venus Williams",
  },
  {
    text: "If you want something you've never had, you must be willing to do something you've never done.",
    author: "Thomas Jefferson",
  },
  {
    text: "The resistance that you fight physically in the gym and the resistance that you fight in life can only build a strong character.",
    author: "Arnold Schwarzenegger",
  },
  {
    text: "Continuous improvement is better than delayed perfection.",
    author: "Mark Twain",
  },
  {
    text: "It's hard to beat a person who never gives up.",
    author: "Babe Ruth",
  },
  {
    text: "Do something today that your future self will thank you for.",
    author: "Sean Patrick Flanery",
  },
  {
    text: "Success is usually the culmination of controlling failure.",
    author: "Sylvester Stallone",
  },
  {
    text: "Think of your workouts as important meetings you schedule with yourself. Bosses don't cancel.",
    author: "Unknown",
  },
  {
    text: "Confidence comes from discipline and training.",
    author: "Robert Kiyosaki",
  },
  {
    text: "What hurts today makes you stronger tomorrow.",
    author: "Jay Cutler",
  },
  {
    text: "Strength does not come from physical capacity. It comes from an indomitable will.",
    author: "Mahatma Gandhi",
  },
  {
    text: "Motivation is what gets you started. Habit is what keeps you going.",
    author: "Jim Ryun",
  },
  {
    text: "A champion is someone who gets up when they can't.",
    author: "Jack Dempsey",
  },
  {
    text: "The only bad workout is the one that didn't happen.",
    author: "Unknown",
  },
  {
    text: "Don't be afraid of failure. This is the way to succeed.",
    author: "LeBron James",
  },
  {
    text: "You did not wake up today to be mediocre.",
    author: "Robin Arzon",
  },
  {
    text: "If it doesn't challenge you, it doesn't change you.",
    author: "Fred DeVito",
  },
  {
    text: "You can either suffer the pain of discipline or the pain of regret.",
    author: "Jim Rohn",
  },
  {
    text: "We can push ourselves further. We always have more to give.",
    author: "Simone Biles",
  },
  {
    text: "Every champion was once a contender who refused to give up.",
    author: "Rocky Balboa",
  },
  {
    text: "Keep working even when no one is watching.",
    author: "Alex Morgan",
  },
  {
    text: "Discipline is the bridge between goals and accomplishment.",
    author: "Jim Rohn",
  },
  {
    text: "Great things come from hard work and perseverance. No excuses.",
    author: "Kobe Bryant",
  },
  {
    text: "Your mind will quit a thousand times before your body will.",
    author: "Reginald Red",
  },
  {
    text: "Set your goals high, and don't stop until you get there.",
    author: "Bo Jackson",
  },
  {
    text: "Be Humble. Be Hungry. And always be the hardest worker in the room.",
    author: "Dwayne “The Rock” Johnson",
  },
  {
    text: "A year from now you may wish you had started today.",
    author: "Karen Lamb",
  },
  {
    text: "Get comfortable with being uncomfortable!",
    author: "Jillian Michaels",
  },
  {
    text: "It's supposed to be hard. If it wasn't hard, everyone would do it. The hard is what makes it great.",
    author: "Tom Hanks",
  },
  {
    text: "Pain is temporary. Quitting lasts forever.",
    author: "Lance Armstrong",
  },
  {
    text: "No matter how many mistakes you make or how slow you progress, you are still way ahead of everyone who isn't trying.",
    author: "Tony Robbins",
  },
  {
    text: "The only person you are destined to become is the person you decide to be.",
    author: "Ralph Waldo Emerson",
  },
  {
    text: "The successful warrior is the average man, with laser-like focus.",
    author: "Bruce Lee",
  },
];

const STORAGE_KEY = "axion-daily-reminder";

function dayOfYear(date: Date) {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export function getTodayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function getDailyQuote(date = new Date()): MotivationalQuote {
  const index = dayOfYear(date) % MOTIVATIONAL_QUOTES.length;
  return MOTIVATIONAL_QUOTES[index]!;
}

export function wasDailyReminderSeen(date = new Date()) {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(STORAGE_KEY) === getTodayKey(date);
  } catch {
    return false;
  }
}

export function markDailyReminderSeen(date = new Date()) {
  try {
    localStorage.setItem(STORAGE_KEY, getTodayKey(date));
  } catch {
    /* ignore quota / private mode */
  }
}
