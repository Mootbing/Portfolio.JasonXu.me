const ARCHIVES = [
  { year: "Mar 2026", title: "Ball Knowledge", description: "Intelligence platform for NBA matches built w/ AirBnB UI.", link: "https://ball-knowledge-theta.vercel.app/", tags: ["Next", "REST API", "Ticketmaster API"] },
  { year: "Nov 2025", title: "Raidar.net", description: "Open-sourced Gotham by Palantir for fun.", link: "https://raidar.net/", tags: ["Next", "OpenSky API"] },
  { year: "Jul 2025", title: "Linge", description: "Tinder + Hinge = Linge. Swipe through weekly coffee chat matches", link: "", tags: ["Flutter", "Supabase", "Clado"] },
  { year: "Jun 2025", title: "Iron Empire", description: "Cloned my childhood's favorite game (中华铁路 @ QQ)", link: "", tags: ["Next", "Supabase", "Google Maps API"] },
  { year: "May 2025", title: "Moonbeam", description: "AI career planner. Build timelines on how to get your dream job based on your school's alumni who are there & their former stats", link: "", tags: ["Next", "Supabase", "Clado"] },
  { year: "Jan 2025", title: "Poke", description: "Soft-\"where\" to nudge your friends to hang out based on physical proximity and calendar availability", link: "", tags: ["Expo", "Supabase"] },
  { year: "Jan 2025", title: "Repository Analyzer", description: "Creates line-by-line breakdown of codebase to be summarized in a Readme.md file attachment", link: "https://github.com/Mootbing/repository-analytics", tags: ["Python"] },
  { year: "Oct 2024", title: "Black Hole Racing Game", description: "Pose-based game for mobility-limited patient rehabilitation. Designed for clinical trials at UPenn Perelman School of Medicine", link: "", tags: ["UE5", "C++"] },
  { year: "Dec 2023", title: "Browser Project", description: "Wrote glass-morphic browser 3 years before Apple got to it", link: "https://github.com/Mootbing/Lake-Browser-Project", tags: ["SwiftUI"] },
  { year: "Nov 2023", title: "Smarter", description: "Cluely in 2023", link: "https://github.com/Mootbing/Smart", tags: ["Python", "GPT"] },
  { year: "Sep 2023", title: "The Verse", description: "Landing page for a VR&AR startup using space for education", link: "", tags: ["Figma"] },
  { year: "Aug 2023", title: "Slate", description: "Stress-relieving typing app (Electron.js learning project)", link: "https://github.com/Mootbing/Slate", tags: ["Electron.js"] },
  { year: "Jul 2023", title: "Simply", description: "Simply by Xatalyst Labs is a forked workout app for Empire Dragons NYC rowing team", link: "", tags: ["Expo", "Firebase"] },
  { year: "Jul 2023", title: "Xatalyst Labs", description: "R&D for pose-tracking mobile workout app", link: "", tags: ["Expo", "Firebase"] },
  { year: "Jul 2023", title: "hs.JasonXu.me", description: "High school portfolio", link: "https://hs.jasonxu.me", tags: ["Next", "Figma", "SVGs"] },
  { year: "Jul 2023", title: "Yaemage", description: "Lazy-loading SVG library used in 17.JasonXu.me & The Verse", link: "https://github.com/Mootbing/Yaemage", tags: ["JS", "SVG"] },
  { year: "Jul 2023", title: "Now Playing Wallpaper", description: "Music Windows wallpaper (w/ Lively.js SDK)", link: "https://github.com/Mootbing/now-playing-wallpaper", tags: ["JS"] },
  { year: "Jun 2023", title: "DINO", description: "Landing page for Web3 startup", link: "", tags: ["Next", "Figma"] },
  { year: "May 2023", title: "Simpact", description: "Genshin Impact with guns. Yes, I know, I was that degen", link: "https://github.com/Cowland-Game-Studios/Simpact", tags: ["UE5", "C++", "Blender"] },
  { year: "May 2023", title: "GNEC Hackathon Website", description: "Website for Global NGO Executive Committee's Hackathon I founded", link: "https://github.com/GNEC-Hackathon", tags: ["HTML", "CSS", "JS"] },
  { year: "Mar 2023", title: "Moot", description: "Didn't want to do homework. Wrote key terms & vocabulary extractor for web pages", link: "", tags: ["JS"] },
  { year: "Mar 2023", title: "MyTube", description: "Can't control myself so I deleted shorts, recommendations, and autoplay from YouTube UI", link: "", tags: ["JS"] },
  { year: "Feb 2023", title: "SLATE", description: "AR glasses for live transcription and translation", link: "https://studio.youtube.com/video/zlGLyyv3_8o/edit", tags: ["ESP32", "BLE", "React Native"] },
  { year: "Jan 2023", title: "Journey", description: "Wrote trauma-responsive teaching game for refugee children used by Rotary International", link: "https://www.youtube.com/watch?v=LXthMbQGSg8", tags: ["Expo", "React Native"] },
  { year: "Nov 2022", title: "Holes", description: "Flashcard generator powered by GPT-3 as demo to faculty on abilities of ChatGPT in the classroom", link: "", tags: ["React", "Figma"] },
  { year: "Sep 2022", title: "Liquify", description: "Created dynamic hardware water bottles with attachment system & companion app", link: "https://github.com/Hydrate-App", tags: ["3D Printing", "CAD", "Expo"] },
  { year: "Jan 2022", title: "VRChery", description: "Got gifted VR headsets but had no money to buy games. Wrote a tower defense game to play", link: "https://github.com/Cowland-Game-Studios/VRchery/", tags: ["VR/AR", "UE5"] },
  { year: "Sep 2021", title: "Murder Mystery Bot", description: "Discord bot for playing Mafia. Complete with room creation & management", link: "https://github.com/Cowland-Game-Studios/Murder-Moostery/", tags: ["Python", "Discord.py"] },
  { year: "Aug 2021", title: "Ninety Nine", description: "Socket I/O card game. Rewrite of 2019", link: "", tags: ["Python"] },
  { year: "Aug 2021", title: "LoneCity", description: "City building game", link: "https://cowlandgamestudios.itch.io/lone-city", tags: ["UE4"] },
  { year: "Jul 2021", title: "FreeThem", description: "First multiplayer game I wrote about escaping convicts", link: "https://cowlandgamestudios.itch.io/freethem", tags: ["UE4"] },
  { year: "Jun 2021", title: "BSGO", description: "My cousin's parents banned COD. We wrote our own", link: "https://github.com/Cowland-Game-Studios/BSGO", tags: ["UE4"] },
  { year: "Apr 2021", title: "Textplifier", description: "Adds Japanese emoticons to iMessage via keybinds", link: "https://github.com/Mootbing/Textplifier", tags: ["Python", "Tkinter"] },
  { year: "Mar 2021", title: "Unholy Mail Bot", description: "Spams people's mailboxes with SMTP servers", link: "https://github.com/Mootbing/unholy-email-bot", tags: ["Python", "SMTP"] },
  { year: "Feb 2021", title: "Rolling Ball", description: "Cash-grab style mobile game inspired by Going Balls", link: "", tags: ["UE4"] },
  { year: "Nov 2020", title: "Subway Chaos", description: "Overhauled subway conductor game from scratch", link: "https://cowlandgamestudios.itch.io/subway-chaos", tags: ["UE4"] },
  { year: "Oct 2020", title: "Very Impressive Parkour Game", description: "Learning Unreal Engine", link: "https://cowlandgamestudios.itch.io/parkour-bad-game", tags: ["UE4"] },
  { year: "Apr 2020", title: "Tower of Cowland", description: "Code.org hour of code turned into a week of code to write a cow-themed dungeon crawler", link: "https://studio.code.org/projects/gamelab/1wIgRYFI7WWGAVgov2JUZN8iNlUaA_7siZLFTZU641k", tags: ["JS"] },
  { year: "2019", title: "OpenProcessing", description: "Learned P5JS from Ubisoft's {code}school tutorials", link: "https://openprocessing.org/user/150793#activity", tags: ["P5JS"] },
  { year: "2019", title: "Project Enkrypto", description: "Cousin's parents found Project Chatty, so I wrote a cipher", link: "https://github.com/weakunix/python_git/tree/master/inactive/ProjektEnkrypto", tags: ["Python"] },
  { year: "2019", title: "Project Chatty", description: "Cousin's parents banned iMessage. Wrote it myself via Socket I/O", link: "https://github.com/weakunix/python_git/tree/master/inactive/ProjectChatty", tags: ["Python", "Socket"] },
  { year: "2013-2020", title: "Scratch.mit.edu", description: "We all start somewhere :)", link: "https://scratch.mit.edu/users/KingOfCowland/", tags: ["Scratch"] },
];

function ExternalLinkIcon() {
  return (
    <svg
      width="8"
      height="8"
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="inline-block ml-1"
      style={{ verticalAlign: "middle", marginBottom: "1px", color: "#333333" }}
    >
      <path d="M4.5 1.5H2a.5.5 0 00-.5.5v8a.5.5 0 00.5.5h8a.5.5 0 00.5-.5V7.5" />
      <path d="M7 1.5h3.5V5" />
      <path d="M5 7L10.5 1.5" />
    </svg>
  );
}

export default function More() {
  return (
    <div
      className="min-h-screen px-6 md:px-12 py-20 max-w-2xl mx-auto"
      style={{
        fontFamily: "var(--font-montserrat), sans-serif",
        fontWeight: 300,
        color: "#333333",
      }}
    >
      <a
        href="/"
        className="text-sm mb-12 inline-block inline-link"
        style={{ color: "#999999" }}
      >
        &larr; back
      </a>
      <h1
        className="text-3xl mb-12"
        style={{
          fontFamily: "var(--font-playfair), serif",
          fontWeight: 300,
        }}
      >
        More
      </h1>
      <ul className="space-y-6" style={{ listStyle: "none", padding: 0 }}>
        {ARCHIVES.map((p) => (
          <li key={`${p.year}-${p.title}`}>
            <span className="text-xs tracking-widest uppercase" style={{ color: "#999999" }}>
              {p.year}
            </span>
            <div className="text-base" style={{ color: "#333333" }}>
              {p.link ? (
                <a
                  href={p.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-link"
                  style={{ color: "inherit", textDecoration: "none" }}
                >
                  {p.title}
                  <ExternalLinkIcon />
                </a>
              ) : (
                p.title
              )}
            </div>
            <div className="text-sm" style={{ color: "#666666" }}>
              {p.description}
            </div>
            {/* Tags hidden for now
            <div className="text-xs mt-1" style={{ color: "#aaaaaa" }}>
              {p.tags.join(", ")}
            </div>
            */}
          </li>
        ))}
      </ul>
    </div>
  );
}
