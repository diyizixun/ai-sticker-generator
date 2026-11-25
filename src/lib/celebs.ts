// 名人面部特征 + 性别词增强 — 单一数据源
// generate/route.ts 和 image-to-sticker/route.ts 都从此 import
// 格式: [匹配关键词（小写，中英文）, 面部特征描述（英文，放最前面权重最高）]
export const CELEB_TRAITS: [string, string][] = [
  // === 中文关键词 ===
  ["马斯克", "elon musk lookalike: balding man with short brown hair, receding hairline, square jaw, blue eyes, fair skin, mid-50s, stocky build"],
  ["特斯拉", "elon musk lookalike: balding man with short brown hair, receding hairline, square jaw, blue eyes, fair skin, mid-50s"],
  ["特朗普", "trump lookalike: blonde comb-over hairstyle, orange-tinted skin, blue eyes, broad face, pursed lips, heavyset build, late 70s man"],
  ["川普", "trump lookalike: blonde comb-over hairstyle, orange-tinted skin, blue eyes, broad face, pursed lips, late 70s"],
  ["拜登", "biden lookalike: white thinning hair, blue eyes, fair skin, wrinkled face, elderly man"],
  ["奥巴马", "obama lookalike: short cropped black hair, dark brown skin, brown eyes, slim face, middle-aged Black man"],
  ["普京", "putin lookalike: balding blonde hair, blue eyes, pale skin, stern expression, compact build, late 60s"],
  ["马克龙", "macron lookalike: short dark hair, blue eyes, fair skin, slim face, middle-aged French man"],
  ["泽连斯基", "zelensky lookalike: short brown hair, brown eyes, fair skin, stubble beard, middle-aged man"],
  ["马云", "jack ma lookalike: balding man, small stature, round face, dark eyes, East Asian, glasses, distinctive smile"],
  ["马化腾", "Chinese middle-aged man, short black hair, round face, glasses, East Asian"],
  ["雷军", "middle-aged Chinese man, short black hair, round face, glasses, energetic smile"],
  ["刘强东", "middle-aged Chinese man, short black hair, square face, glasses, East Asian"],
  ["张一鸣", "young Chinese man, short black hair, glasses, slim face, neutral expression"],
  ["任正非", "elderly Chinese man, balding gray hair, square glasses, weathered face, severe expression"],
  ["张艺谋", "elderly Chinese man, gray hair, glasses, weathered face, East Asian"],
  ["梅西", "messi lookalike: short brown hair, brown eyes, fair skin, short beard, compact build, Argentine man"],
  ["c罗", "ronaldo lookalike: short dark hair, brown eyes, olive skin, muscular build, Portuguese man"],
  ["贝克汉姆", "beckham lookalike: short blonde hair, blue eyes, fair skin, handsome face, tattoos, slim build"],
  ["詹姆斯", "lebron lookalike: short black hair, dark brown skin, brown eyes, tall muscular build, beard, Black man"],
  ["乔丹", "jordan lookalike: bald head, dark brown skin, brown eyes, tall athletic build, Black man"],
  ["泰勒斯威夫特", "taylor swift lookalike: long blonde straight hair, blue eyes, fair skin, red lips, slim face, young woman"],
  ["霉霉", "taylor swift lookalike: long blonde straight hair, blue eyes, fair skin, red lips, slim face, young woman"],
  ["碧昂斯", "beyonce lookalike: long blonde wavy hair, light brown skin, brown eyes, curvy build, glamorous woman"],
  ["蕾哈娜", "rihanna lookalike: short dark hair, brown skin, green eyes, full lips, Barbadian woman"],
  ["金卡戴珊", "kim kardashian lookalike: long dark hair, olive skin, brown eyes, full lips, curvy figure"],
  ["艾玛沃森", "emma watson lookalike: short brown hair, brown eyes, fair skin, slim face, British young woman"],
  ["斯嘉丽约翰逊", "scarlett johansson lookalike: short blonde hair, blue eyes, fair skin, full lips, curvy figure"],
  ["安吉丽娜朱莉", "angelina jolie lookalike: long dark hair, blue eyes, fair skin, full lips, distinctive cheekbones"],
  // === 英文关键词 ===
  ["elon musk", "elon musk lookalike: balding man with short brown hair, receding hairline, square jaw, blue eyes, fair skin, mid-50s, stocky build"],
  ["musk", "elon musk lookalike: balding man with short brown hair, receding hairline, square jaw, blue eyes, fair skin, mid-50s"],
  ["mark zuckerberg", "zuckerberg lookalike: short curly brown hair, pale skin, blue eyes, narrow face, thin lips, young man"],
  ["zuckerberg", "zuckerberg lookalike: short curly brown hair, pale skin, blue eyes, narrow face, thin lips"],
  ["steve jobs", "steve jobs lookalike: bald head, gray stubble beard, round glasses, gaunt face, fair skin, middle-aged"],
  ["tim cook", "tim cook lookalike: short gray hair, clean shaven, fair skin, blue eyes, slim face, middle-aged"],
  ["bill gates", "bill gates lookalike: balding with glasses, fair skin, blue eyes, round face, middle-aged"],
  ["jack ma", "jack ma lookalike: balding man, small stature, round face, dark eyes, East Asian, glasses"],
  ["ren zhengfei", "elderly Chinese man, balding gray hair, square glasses, weathered face, severe expression"],
  ["zhang yiming", "young Chinese man, short black hair, glasses, slim face, neutral expression"],
  ["lei jun", "middle-aged Chinese man, short black hair, round face, glasses, energetic smile"],
  ["donald trump", "trump lookalike: blonde comb-over hairstyle, orange-tinted skin, blue eyes, broad face, pursed lips, heavyset build, late 70s man"],
  ["trump", "trump lookalike: blonde comb-over hair, orange skin, blue eyes, broad face, pursed lips, late 70s"],
  ["joe biden", "biden lookalike: white thinning hair, blue eyes, fair skin, wrinkled face, elderly man"],
  ["biden", "biden lookalike: white thinning hair, blue eyes, fair skin, wrinkled elderly face"],
  ["barack obama", "obama lookalike: short cropped black hair, dark brown skin, brown eyes, slim face, warm smile, middle-aged Black man"],
  ["obama", "obama lookalike: short cropped black hair, dark brown skin, brown eyes, slim face"],
  ["vladimir putin", "putin lookalike: balding blonde hair, blue eyes, pale skin, stern expression, compact build, late 60s"],
  ["putin", "putin lookalike: balding blonde hair, blue eyes, pale skin, stern expression, late 60s"],
  ["xi jinping", "Chinese man, short black hair, broad face, dark eyes, portly build, stern expression, middle-aged"],
  ["jinping", "Chinese man, short black hair, broad face, dark eyes, portly build"],
  ["kim jong un", "kim jong un lookalike: short black buzzcut, round flat face, dark eyes, overweight, East Asian"],
  ["kim jong", "kim jong un lookalike: short black buzzcut, round face, dark eyes, overweight"],
  ["narendra modi", "modi lookalike: white hair, gray beard, dark skin, Indian man, elderly"],
  ["modi", "modi lookalike: white hair, gray beard, dark skin, Indian man, elderly"],
  ["emmanuel macron", "macron lookalike: short dark hair, blue eyes, fair skin, slim face, middle-aged French"],
  ["macron", "macron lookalike: short dark hair, blue eyes, fair skin, slim face, middle-aged"],
  ["zelensky", "zelensky lookalike: short brown hair, brown eyes, fair skin, stubble beard, middle-aged"],
  ["zelenskyy", "zelensky lookalike: short brown hair, brown eyes, fair skin, stubble beard"],
  ["kanye west", "kanye west lookalike: bald head, brown skin, brown eyes, full beard, stocky build"],
  ["kanye", "kanye west lookalike: bald head, brown skin, brown eyes, full beard"],
  ["tom cruise", "tom cruise lookalike: short brown hair, blue eyes, fair skin, square jaw, middle-aged man"],
  ["brad pitt", "brad pitt lookalike: long blonde hair, blue eyes, fair skin, strong jaw, goatee"],
  ["leonardo dicaprio", "dicaprio lookalike: slicked back blonde hair, blue eyes, fair skin, round face, goatee"],
  ["leo dicaprio", "dicaprio lookalike: slicked back blonde hair, blue eyes, fair skin, round face"],
  ["michael jordan", "jordan lookalike: bald head, dark brown skin, brown eyes, tall athletic build, Black man"],
  ["lebron james", "lebron lookalike: short black hair, dark brown skin, brown eyes, tall muscular build, beard, Black"],
  ["messi", "messi lookalike: short brown hair, brown eyes, fair skin, short beard, compact build, Argentine"],
  ["lionel messi", "messi lookalike: short brown hair, brown eyes, fair skin, short beard"],
  ["cristiano ronaldo", "ronaldo lookalike: short dark hair, brown eyes, olive skin, muscular build, Portuguese"],
  ["ronaldo", "ronaldo lookalike: short dark hair, brown eyes, olive skin, muscular build"],
  ["cr7", "ronaldo lookalike: short dark hair, brown eyes, olive skin, muscular build"],
  ["david beckham", "beckham lookalike: short blonde hair, blue eyes, fair skin, handsome face, tattoos"],
  ["tiger woods", "tiger woods lookalike: short black hair, brown skin, brown eyes, goatee, athletic build"],
  ["snoop dogg", "snoop dogg lookalike: tall slim build, long braided black hair, dark brown skin, goatee, sunglasses"],
  ["eminem", "eminem lookalike: short bleached blonde hair, blue eyes, fair skin, slim face, Caucasian"],
  ["drake", "drake lookalike: short black hair, dark beard, brown skin, brown eyes, stocky build, Black"],
  ["taylor swift", "taylor swift lookalike: long blonde straight hair, blue eyes, fair skin, red lips, slim face, young woman"],
  ["beyonce", "beyonce lookalike: long blonde wavy hair, light brown skin, brown eyes, curvy build, glamorous woman"],
  ["lady gaga", "lady gaga lookalike: long blonde hair, blue eyes, fair skin, bold makeup, theatrical expression"],
  ["rihanna", "rihanna lookalike: short dark hair, brown skin, green eyes, full lips, Barbadian woman"],
  ["adele", "adele lookalike: long red-blonde hair, blue eyes, fair skin, round face, fuller figure, British"],
  ["miley cyrus", "miley cyrus lookalike: short blonde hair, blue eyes, fair skin, slim face, young woman"],
  ["katy perry", "katy perry lookalike: long dark hair, blue eyes, fair skin, full lips, young woman"],
  ["shakira", "shakira lookalike: long blonde wavy hair, brown eyes, fair skin, Colombian woman, slim build"],
  ["kim kardashian", "kim kardashian lookalike: long dark hair, olive skin, brown eyes, full lips, curvy figure, glamorous"],
  ["kylie jenner", "kylie jenner lookalike: long dark hair, olive skin, full lips, young woman, glamorous makeup"],
  ["emma watson", "emma watson lookalike: short brown hair, brown eyes, fair skin, slim face, British young woman"],
  ["scarlett johansson", "scarlett johansson lookalike: short blonde hair, blue eyes, fair skin, full lips, curvy figure"],
  ["angelina jolie", "angelina jolie lookalike: long dark hair, blue eyes, fair skin, full lips, distinctive cheekbones"],
  ["megan fox", "megan fox lookalike: long dark hair, blue eyes, fair skin, full lips, distinctive eyebrows"],
  ["marilyn monroe", "marilyn monroe lookalike: short blonde curly hair, blue eyes, fair skin, beauty mark, red lips, 1950s"],
  ["audrey hepburn", "audrey hepburn lookalike: short dark hair, brown eyes, fair skin, slim face, elegant 1950s"],
];

const MALE_WORDS = [
  "\\bman\\b", "\\bmen\\b", "\\bmale\\b", "\\bboy\\b", "\\bboys\\b",
  "\\bguy\\b", "\\bguys\\b", "\\bgentleman\\b", "\\bgentlemen\\b",
  "\\bhusband\\b", "\\bfather\\b", "\\bbrother\\b", "\\bson\\b",
  "\\buncle\\b", "\\bgrandpa\\b", "\\bking\\b", "\\bprince\\b",
  "\\bactor\\b", "\\bwaiter\\b", "\\bhero\\b",
];
const FEMALE_WORDS = [
  "\\bwoman\\b", "\\bwomen\\b", "\\bfemale\\b", "\\bgirl\\b", "\\bgirls\\b",
  "\\blady\\b", "\\bladies\\b", "\\bgal\\b", "\\bgals\\b",
  "\\bwife\\b", "\\bmother\\b", "\\bmom\\b", "\\bsister\\b", "\\bdaughter\\b",
  "\\baunt\\b", "\\bgrandma\\b", "\\bqueen\\b", "\\bprincess\\b",
  "\\bactress\\b", "\\bwaitress\\b", "\\bheroine\\b",
];

/**
 * 名人面部特征 + 性别词增强
 * generate/route.ts 和 image-to-sticker/route.ts 共用
 */
export function enhancePrompt(prompt: string): string {
  const lower = prompt.toLowerCase();

  // 1) 名人面部特征增强 — 找到匹配的名人，替换用户 prompt 为详细五官描述
  for (const [name, traits] of CELEB_TRAITS) {
    if (lower.includes(name)) {
      return traits + ", " + prompt;
    }
  }

  // 2) 没匹配到名人 → 通用性别词增强
  let addMale = 0;
  let addFemale = 0;
  for (const w of MALE_WORDS) { try { if (new RegExp(w).test(lower)) addMale++; } catch {} }
  for (const w of FEMALE_WORDS) { try { if (new RegExp(w).test(lower)) addFemale++; } catch {} }

  if (addMale > 0 && addMale > addFemale) {
    return prompt + ", middle-aged male subject, masculine facial features, handsome man";
  }
  if (addFemale > 0 && addFemale > addMale) {
    return prompt + ", adult female subject, feminine facial features, beautiful woman";
  }
  return prompt;
}
