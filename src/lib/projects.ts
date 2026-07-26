export type ProjectFramework = {
  id: number;
  name: string;
};

export type Project = {
  id: number;
  name: string;
  description: string;
  href: string;
  image: string;
  bgImage: string;
  frameworks: ProjectFramework[];
};

export const PROJECT_WORK_IMAGES = [
  "/assets/projects/works1.png",
  "/assets/projects/works2.png",
  "/assets/projects/works3.jpg",
  "/assets/projects/works4.png",
  "/assets/projects/works5.png",
  "/assets/projects/works6.jpg",
  "/assets/projects/work.png",
  "/assets/projects/works7.png",
] as const;

export const PROJECTS: Project[] = [
  {
    id: 1,
    name: "Blanc Cafe Point Landing Page",
    description: "On Sale System for Blanc Cafe Point",
    href: "https://restaurant-pos-one-swart.vercel.app/",
    image: PROJECT_WORK_IMAGES[0],
    bgImage: PROJECT_WORK_IMAGES[0],
    frameworks: [
      { id: 1, name: "React.js" },
      { id: 2, name: "Tailwind CSS" },
      { id: 3, name: "Supabase" },
    ],
  },
  {
    id: 2,
    name: "Jazz MotoLab E-Commerce & Point of Sale System",
    description: "E-Commerce & Point of Sale System for Jazz MotoLab",
    href: "https://jazzmotolab.com/",
    image: PROJECT_WORK_IMAGES[6],
    bgImage: PROJECT_WORK_IMAGES[6],
    frameworks: [
      { id: 1, name: "Next.js" },
      { id: 2, name: "React.js" },
      { id: 3, name: "PostgreSQL" },
    ],
  },
  {
    id: 3,
    name: "CNCI Church Management System",
    description: "Church Management System for CNCI Church",
    href: "",
    image: PROJECT_WORK_IMAGES[3],
    bgImage: PROJECT_WORK_IMAGES[3],
    frameworks: [
      { id: 1, name: "Laravel" },
      { id: 2, name: "MySQL" },
      { id: 3, name: "Php" },
    ],
  },
  {
    id: 4,
    name: "BodySync Gym Management System",
    description: "BodySync Gym Management System",
    href: "https://campus.example.com/",
    image: PROJECT_WORK_IMAGES[2],
    bgImage: PROJECT_WORK_IMAGES[2],
    frameworks: [
      { id: 1, name: "Vue.js" },
      { id: 2, name: "Laravel" },
      { id: 3, name: "MySQL" },
    ],
  },
  {
    id: 5,
    name: "Kids Castle Enrollment System",
    description: "Kids Camp Enrollment System for Kids Camp",
    href: "https://games-reviews.example.com/",
    image: PROJECT_WORK_IMAGES[4],
    bgImage: PROJECT_WORK_IMAGES[4],
    frameworks: [
      { id: 1, name: "Laravel" },
      { id: 2, name: "Bootstrap" },
      { id: 3, name: "MySQL" },
    ],
  },
  {
    id: 6,
    name: "Blanc Cafe Point on Sale System  ",
    description: "On Sale System for Blanc Cafe Point",
    href: "https://gaming-hub.example.com/",
    image: PROJECT_WORK_IMAGES[1],
    bgImage: PROJECT_WORK_IMAGES[1],
    frameworks: [
      { id: 1, name: "React.js" },
      { id: 2, name: "Express" },
      { id: 3, name: "Redis" },
    ],
  },
  {
    id: 7,
    name: "BodySync Fitness Workout App",
    description: "Workout tracker with daily programs, exercise guides, and calorie tracking.",
    href: "",
    image: PROJECT_WORK_IMAGES[5],
    bgImage: PROJECT_WORK_IMAGES[5],
    frameworks: [
      { id: 1, name: "Flutter" },
      { id: 2, name: "Rest API" },
      { id: 3, name: "Firebase" },
    ],
  },
  {
    id: 8,
    name: "Spiderman Portfolio Website Clone",
    description: "Portfolio Website for Spiderman",
    href: "",
    image: PROJECT_WORK_IMAGES[7],
    bgImage: PROJECT_WORK_IMAGES[7],
    frameworks: [
      { id: 1, name: "React.js" },
      { id: 2, name: "Tailwind Css" },
      { id: 3, name: "Gsap" },
    ],
  },
];

export const PROJECTS_INTRO = `Featured projects that have been meticulously
crafted with passion to drive
results and impact.`;
