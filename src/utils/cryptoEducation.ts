// Educational content about cryptocurrency categories and concepts

export interface EducationCard {
  id: string;
  title: string;
  description: string;
  icon: 'help' | 'info' | 'lightbulb';
  category?: string;
}

// Category explanations
export const categoryExplanations: Record<string, EducationCard> = {
  'DeFi': {
    id: 'defi',
    title: 'What is DeFi?',
    description: 'Decentralized Finance (DeFi) refers to financial services built on blockchain networks that operate without traditional intermediaries like banks. DeFi platforms enable lending, borrowing, trading, and earning interest through smart contracts.',
    icon: 'info',
    category: 'DeFi',
  },
  'Layer 1': {
    id: 'layer1',
    title: 'What is Layer 1?',
    description: 'Layer 1 refers to the base blockchain network that handles transactions and consensus. Examples include Bitcoin, Ethereum, and Solana. These networks form the foundation for other applications and protocols.',
    icon: 'info',
    category: 'Layer 1',
  },
  'Layer 2': {
    id: 'layer2',
    title: 'What is Layer 2?',
    description: 'Layer 2 solutions are built on top of Layer 1 blockchains to improve scalability and reduce transaction costs. They process transactions off-chain and settle on the main blockchain, enabling faster and cheaper transactions.',
    icon: 'info',
    category: 'Layer 2',
  },
  'NFT': {
    id: 'nft',
    title: 'What are NFTs?',
    description: 'Non-Fungible Tokens (NFTs) are unique digital assets that represent ownership of items like art, collectibles, or virtual real estate. Each NFT is one-of-a-kind and cannot be replaced by another token.',
    icon: 'info',
    category: 'NFT',
  },
  'Gaming': {
    id: 'gaming',
    title: 'What is GameFi?',
    description: 'GameFi combines gaming with decentralized finance, allowing players to earn cryptocurrency and NFTs through gameplay. Players can own in-game assets, trade them, and participate in play-to-earn economies.',
    icon: 'info',
    category: 'Gaming',
  },
  'Meme': {
    id: 'meme',
    title: 'What are Meme Coins?',
    description: 'Meme coins are cryptocurrencies inspired by internet memes or jokes. They often have strong community support and viral potential, but typically lack fundamental utility. Examples include Dogecoin and Shiba Inu.',
    icon: 'lightbulb',
    category: 'Meme',
  },
  'Stablecoins': {
    id: 'stablecoins',
    title: 'What are Stablecoins?',
    description: 'Stablecoins are cryptocurrencies designed to maintain a stable value, usually pegged to fiat currencies like the US Dollar. They provide price stability and are commonly used for trading and as a store of value.',
    icon: 'info',
    category: 'Stablecoins',
  },
  'Exchange': {
    id: 'exchange',
    title: 'What are Exchange Tokens?',
    description: 'Exchange tokens are cryptocurrencies issued by cryptocurrency exchanges. They often provide benefits like reduced trading fees, staking rewards, and access to exclusive features on the exchange platform.',
    icon: 'info',
    category: 'Exchange',
  },
  'Metaverse': {
    id: 'metaverse',
    title: 'What is the Metaverse?',
    description: 'The Metaverse refers to virtual worlds where users can interact, socialize, and transact. Metaverse projects use blockchain technology to enable ownership of virtual land, avatars, and digital assets.',
    icon: 'info',
    category: 'Metaverse',
  },
  'AI & Big Data': {
    id: 'ai-bigdata',
    title: 'What is AI in Crypto?',
    description: 'AI and Big Data projects in crypto use artificial intelligence and data analytics to improve blockchain efficiency, trading algorithms, and decentralized applications. They combine AI technology with blockchain infrastructure.',
    icon: 'lightbulb',
    category: 'AI & Big Data',
  },
  'Smart Contracts': {
    id: 'smart-contracts',
    title: 'What are Smart Contracts?',
    description: 'Smart contracts are self-executing programs stored on a blockchain that automatically execute when predetermined conditions are met. They enable trustless transactions and form the basis of DeFi and many blockchain applications.',
    icon: 'info',
    category: 'Smart Contracts',
  },
  'Privacy Coins': {
    id: 'privacy',
    title: 'What are Privacy Coins?',
    description: 'Privacy coins are cryptocurrencies designed to provide enhanced anonymity and privacy for transactions. They use advanced cryptographic techniques to obscure transaction details and protect user identity.',
    icon: 'info',
    category: 'Privacy Coins',
  },
};

// General crypto education tips
export const generalEducationTips: EducationCard[] = [
  {
    id: 'diversification',
    title: 'Portfolio Diversification',
    description: 'Diversifying your portfolio across different categories (DeFi, Layer 1, NFTs, etc.) can help reduce risk. Don\'t put all your investments in one type of asset.',
    icon: 'lightbulb',
  },
  {
    id: 'research',
    title: 'Do Your Own Research',
    description: 'Always research projects before investing. Check the team, technology, use case, and community. Understand what problem the project solves.',
    icon: 'help',
  },
  {
    id: 'volatility',
    title: 'Understanding Volatility',
    description: 'Cryptocurrency markets are highly volatile. Prices can change dramatically in short periods. Only invest what you can afford to lose.',
    icon: 'info',
  },
  {
    id: 'market-cap',
    title: 'Market Capitalization',
    description: 'Market cap = price × circulating supply. It represents the total value of a cryptocurrency. Higher market cap often indicates more stability, but not always.',
    icon: 'info',
  },
  {
    id: 'risk',
    title: 'Risk Management',
    description: 'Never invest more than you can afford to lose. Consider your risk tolerance and investment goals. Cryptocurrency investments carry significant risk.',
    icon: 'help',
  },
];

// Get education card for a category
export function getCategoryEducation(category: string): EducationCard | null {
  return categoryExplanations[category] || null;
}

// Get random education tip
export function getRandomEducationTip(): EducationCard {
  const tips = generalEducationTips;
  return tips[Math.floor(Math.random() * tips.length)];
}

