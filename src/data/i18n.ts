import { Language } from '../types/app';

export const COPY: Record<
  Language,
  {
    nav: {
      apps: string;
      featured: string;
      releases: string;
      about: string;
      manage: string;
      addApp: string;
    };
    hero: {
      exploreCta: string;
      githubCta: string;
      statApps: string;
      statSource: string;
      statSourceVal: string;
      statPlatforms: string;
      statDelivery: string;
      statDeliveryVal: string;
    };
    showcase: {
      all: string;
      searchPlaceholder: string;
      featuredLabel: string;
      catalogTitle: string;
      catalogSub: string;
      download: string;
      downloading: string;
      details: string;
      source: string;
      emptyTitle: string;
      emptySub: string;
      clearFilter: string;
      sampleNotice: string;
      sampleNoticeCta: string;
    };
    releases: {
      title: string;
      sub: string;
      colApp: string;
      colVersion: string;
      colAsset: string;
      colSize: string;
      colAction: string;
      sourceZip: string;
    };
    about: {
      title: string;
      githubProfile: string;
      contact: string;
    };
    modal: {
      directDownload: string;
      viewOnGithub: string;
      highlights: string;
      allAssets: string;
      releaseNotes: string;
      noReleaseNotes: string;
      close: string;
      stars: string;
      downloads: string;
    };
    admin: {
      title: string;
      signInTitle: string;
      signInDesc: string;
      signInBtn: string;
      signOut: string;
      unauthorizedTitle: string;
      unauthorizedDesc: string;
      tabAdd: string;
      tabEdit: string;
      tabApps: string;
      tabImport: string;
      tabSettings: string;
      githubInputLabel: string;
      githubInputPlaceholder: string;
      fetchGithub: string;
      fetching: string;
      fetchSuccess: string;
      nameLabel: string;
      taglineLabel: string;
      descLabel: string;
      platformLabel: string;
      categoryLabel: string;
      versionLabel: string;
      fileSizeLabel: string;
      assetKeywordLabel: string;
      directUrlLabel: string;
      directUrlHint: string;
      coverLabel: string;
      coverCustomPlaceholder: string;
      highlightsLabel: string;
      highlightsHint: string;
      featuredToggle: string;
      publishedToggle: string;
      publishBtn: string;
      updateBtn: string;
      saving: string;
      cancelEdit: string;
      noAppsYet: string;
      deleteConfirm: string;
      confirmYes: string;
      confirmNo: string;
      importTitle: string;
      importPlaceholder: string;
      loadRepos: string;
      useRepo: string;
      settingsSave: string;
      settingsSaved: string;
    };
    toast: {
      downloadStarted: string;
      appPublished: string;
      appUpdated: string;
      appDeleted: string;
      settingsSaved: string;
    };
  }
> = {
  en: {
    nav: {
      apps: 'Apps',
      featured: 'Featured',
      releases: 'Releases',
      about: 'About',
      manage: 'Manage',
      addApp: 'Add App',
    },
    hero: {
      exploreCta: 'Explore Apps',
      githubCta: 'GitHub Releases',
      statApps: 'Published Apps',
      statSource: 'Distribution',
      statSourceVal: 'GitHub Direct',
      statPlatforms: 'Platforms',
      statDelivery: 'Download Flow',
      statDeliveryVal: 'One-Click Binary',
    },
    showcase: {
      all: 'All',
      searchPlaceholder: 'Search apps or repos...',
      featuredLabel: 'Featured Release',
      catalogTitle: 'All Applications',
      catalogSub: 'Clean, up-to-date builds served directly from GitHub.',
      download: 'Download',
      downloading: 'Starting...',
      details: 'Details',
      source: 'GitHub',
      emptyTitle: 'No matching apps found',
      emptySub: 'Try another platform filter or clear your search term.',
      clearFilter: 'Reset filters',
      sampleNotice: 'Showing live GitHub-connected preview apps. Sign in as admin to add your own apps.',
      sampleNoticeCta: 'Add Your App',
    },
    releases: {
      title: 'Direct Release Ledger',
      sub: 'Latest verified packages resolved live from GitHub Releases.',
      colApp: 'Application',
      colVersion: 'Version',
      colAsset: 'Package',
      colSize: 'Size',
      colAction: 'Action',
      sourceZip: 'Source archive (.zip)',
    },
    about: {
      title: 'About This Showcase',
      githubProfile: 'Visit GitHub Profile',
      contact: 'Get in Touch',
    },
    modal: {
      directDownload: 'Direct Download',
      viewOnGithub: 'View Repository',
      highlights: 'Key Highlights',
      allAssets: 'All GitHub Release Files',
      releaseNotes: 'Release Notes',
      noReleaseNotes: 'No additional release notes were published for this version.',
      close: 'Close',
      stars: 'stars',
      downloads: 'downloads',
    },
    admin: {
      title: 'Studio Manager',
      signInTitle: 'Admin Sign-In',
      signInDesc: 'Restricted to owner account (mdrimon01889@gmail.com). Other accounts cannot sign in or register.',
      signInBtn: 'Continue with Google',
      signOut: 'Sign Out',
      unauthorizedTitle: 'Admin Access Required',
      unauthorizedDesc: 'This Google account does not have studio editing permissions. Visitors can freely browse and download all published apps.',
      tabAdd: 'Add App',
      tabEdit: 'Edit App',
      tabApps: 'My Apps',
      tabImport: 'GitHub Import',
      tabSettings: 'Settings',
      githubInputLabel: 'GitHub Repository',
      githubInputPlaceholder: 'owner/repo or https://github.com/owner/repo',
      fetchGithub: 'Fetch from GitHub',
      fetching: 'Fetching...',
      fetchSuccess: 'Synced latest info & release link from GitHub.',
      nameLabel: 'App Name',
      taglineLabel: 'Short Tagline',
      descLabel: 'Description',
      platformLabel: 'Platform',
      categoryLabel: 'Category',
      versionLabel: 'Version',
      fileSizeLabel: 'File Size',
      assetKeywordLabel: 'Preferred File Extension (optional)',
      directUrlLabel: 'Direct Download URL (optional)',
      directUrlHint: 'Leave blank to automatically download the latest GitHub Release asset.',
      coverLabel: 'App Icon / Image',
      coverCustomPlaceholder: 'Or paste an https:// icon image URL...',
      highlightsLabel: 'Highlights (one per line, max 6)',
      highlightsHint: 'Short bullet points shown in the app details modal.',
      featuredToggle: 'Highlight as Featured App',
      publishedToggle: 'Visible to Public Visitors',
      publishBtn: 'Publish App',
      updateBtn: 'Save Changes',
      saving: 'Saving...',
      cancelEdit: 'Cancel Edit',
      noAppsYet: 'No custom apps published yet. Add your first GitHub repository to replace the preview items.',
      deleteConfirm: 'Remove this app?',
      confirmYes: 'Delete',
      confirmNo: 'Cancel',
      importTitle: 'Quick Import from GitHub Profile',
      importPlaceholder: 'Enter your GitHub username (e.g. octocat)',
      loadRepos: 'Load Repositories',
      useRepo: 'Select',
      settingsSave: 'Save Studio Settings',
      settingsSaved: 'Studio settings updated.',
    },
    toast: {
      downloadStarted: 'Downloading directly from GitHub:',
      appPublished: 'App published to your showcase.',
      appUpdated: 'App details saved.',
      appDeleted: 'App removed from showcase.',
      settingsSaved: 'Studio branding updated.',
    },
  },
  bn: {
    nav: {
      apps: 'অ্যাপস',
      featured: 'ফিচার্ড',
      releases: 'রিলিজ',
      about: 'পরিচিতি',
      manage: 'ম্যানেজ',
      addApp: 'অ্যাপ যোগ করুন',
    },
    hero: {
      exploreCta: 'অ্যাপস দেখুন',
      githubCta: 'গিটহাব রিলিজ',
      statApps: 'প্রকাশিত অ্যাপ',
      statSource: 'ডাউনলোড সোর্স',
      statSourceVal: 'সরাসরি গিটহাব',
      statPlatforms: 'প্ল্যাটফর্ম',
      statDelivery: 'ডাউনলোড সিস্টেম',
      statDeliveryVal: 'ওয়ান-ক্লিক ডিরেক্ট',
    },
    showcase: {
      all: 'সবগুলো',
      searchPlaceholder: 'অ্যাপ বা রিপো খুঁজুন...',
      featuredLabel: 'ফিচার্ড রিলিজ',
      catalogTitle: 'সব অ্যাপ্লিকেশন',
      catalogSub: 'সরাসরি গিটহাব রিলিজ থেকে সর্বশেষ ভার্সন এক ক্লিকে ডাউনলোড করুন।',
      download: 'ডাউনলোড',
      downloading: 'শুরু হচ্ছে...',
      details: 'বিস্তারিত',
      source: 'গিটহাব',
      emptyTitle: 'কোনো অ্যাপ পাওয়া যায়নি',
      emptySub: 'অন্য প্ল্যাটফর্ম সিলেক্ট করুন বা সার্চ পরিবর্তন করুন।',
      clearFilter: 'ফিল্টার রিসেট',
      sampleNotice: 'এখন প্রিভিউ অ্যাপ দেখাচ্ছে। আপনার নিজের অ্যাপ যোগ করতে অ্যাডমিন লগইন করুন।',
      sampleNoticeCta: 'নিজের অ্যাপ যোগ করুন',
    },
    releases: {
      title: 'ডিরেক্ট রিলিজ তালিকা',
      sub: 'গিটহাব থেকে লাইভ সিঙ্ক করা সর্বশেষ বিল্ড ও ফাইলসমূহ।',
      colApp: 'অ্যাপ্লিকেশন',
      colVersion: 'ভার্সন',
      colAsset: 'ফাইল',
      colSize: 'সাইজ',
      colAction: 'অ্যাকশন',
      sourceZip: 'সোর্স আর্কাইভ (.zip)',
    },
    about: {
      title: 'স্টুডিও সম্পর্কে',
      githubProfile: 'গিটহাব প্রোফাইল দেখুন',
      contact: 'যোগাযোগ করুন',
    },
    modal: {
      directDownload: 'ডিরেক্ট ডাউনলোড',
      viewOnGithub: 'গিটহাব রিপো দেখুন',
      highlights: 'মূল ফিচারসমূহ',
      allAssets: 'গিটহাব রিলিজের সব ফাইল',
      releaseNotes: 'রিলিজ নোটস',
      noReleaseNotes: 'এই ভার্সনের জন্য আলাদা কোনো রিলিজ নোট নেই।',
      close: 'বন্ধ করুন',
      stars: 'স্টার',
      downloads: 'ডাউনলোড',
    },
    admin: {
      title: 'স্টুডিও ম্যানেজার',
      signInTitle: 'অ্যাডমিন লগইন',
      signInDesc: 'ভবিষ্যতে সহজেই নতুন অ্যাপ যোগ, এডিট বা পাবলিশ করতে আপনার Google অ্যাকাউন্ট দিয়ে লগইন করুন।',
      signInBtn: 'Google দিয়ে লগইন করুন',
      signOut: 'লগ আউট',
      unauthorizedTitle: 'অ্যাডমিন এক্সেস প্রয়োজন',
      unauthorizedDesc: 'এই অ্যাকাউন্টে এডিট করার অনুমতি নেই। ভিজিটররা সব পাবলিশ করা অ্যাপ ডাউনলোড করতে পারবেন।',
      tabAdd: 'নতুন অ্যাপ',
      tabEdit: 'এডিট অ্যাপ',
      tabApps: 'আমার অ্যাপস',
      tabImport: 'গিটহাব ইমপোর্ট',
      tabSettings: 'সেটিংস',
      githubInputLabel: 'গিটহাব রিপোজিটরি',
      githubInputPlaceholder: 'owner/repo অথবা https://github.com/owner/repo',
      fetchGithub: 'গিটহাব থেকে আনুন',
      fetching: 'আনা হচ্ছে...',
      fetchSuccess: 'গিটহাব থেকে অ্যাপের তথ্য ও ডাউনলোড লিংক লোড হয়েছে।',
      nameLabel: 'অ্যাপের নাম',
      taglineLabel: 'সংক্ষিপ্ত ট্যাগলাইন',
      descLabel: 'বিস্তারিত বিবরণ',
      platformLabel: 'প্ল্যাটফর্ম',
      categoryLabel: 'ক্যাটাগরি',
      versionLabel: 'ভার্সন',
      fileSizeLabel: 'ফাইল সাইজ',
      assetKeywordLabel: 'পছন্দের ফাইল ফরম্যাট (ঐচ্ছিক)',
      directUrlLabel: 'ডিরেক্ট ডাউনলোড লিংক (ঐচ্ছিক)',
      directUrlHint: 'ফাঁকা রাখলে গিটহাবের সর্বশেষ রিলিজ অটোমেটিক ডাউনলোড হবে।',
      coverLabel: 'কভার ইমেজ',
      coverCustomPlaceholder: 'অথবা https:// ইমেজ লিংক দিন...',
      highlightsLabel: 'হাইলাইটস (প্রতি লাইনে একটি, সর্বোচ্চ ৬টি)',
      highlightsHint: 'বিস্তারিত ভিউতে এই পয়েন্টগুলো দেখা যাবে।',
      featuredToggle: 'ফিচার্ড অ্যাপ হিসেবে দেখান',
      publishedToggle: 'পাবলিক ওয়েবসাইটে দেখান',
      publishBtn: 'অ্যাপ পাবলিশ করুন',
      updateBtn: 'পরিবর্তন সেভ করুন',
      saving: 'সেভ হচ্ছে...',
      cancelEdit: 'বাতিল করুন',
      noAppsYet: 'এখনো কোনো নিজস্ব অ্যাপ পাবলিশ করা হয়নি। প্রথম গিটহাব রিপো যোগ করুন।',
      deleteConfirm: 'এই অ্যাপটি মুছে ফেলবেন?',
      confirmYes: 'মুছে ফেলুন',
      confirmNo: 'থাক',
      importTitle: 'গিটহাব প্রোফাইল থেকে ইমপোর্ট',
      importPlaceholder: 'আপনার GitHub ইউজারনেম লিখুন',
      loadRepos: 'রিপো লোড করুন',
      useRepo: 'সিলেক্ট',
      settingsSave: 'সেটিংস সেভ করুন',
      settingsSaved: 'স্টুডিও সেটিংস আপডেট হয়েছে।',
    },
    toast: {
      downloadStarted: 'গিটহাব থেকে সরাসরি ডাউনলোড শুরু হচ্ছে:',
      appPublished: 'নতুন অ্যাপ সফলভাবে পাবলিশ হয়েছে।',
      appUpdated: 'অ্যাপের তথ্য আপডেট হয়েছে।',
      appDeleted: 'অ্যাপটি তালিকা থেকে মুছে ফেলা হয়েছে।',
      settingsSaved: 'স্টুডিও সেটিংস সেভ হয়েছে।',
    },
  },
};
