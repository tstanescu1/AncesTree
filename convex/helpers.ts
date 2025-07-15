import { STANDARD_MEDICINAL_TAGS, STANDARD_PREPARATION_METHODS, STANDARD_PLANT_PARTS, TAG_NORMALIZATION_MAP } from "./constants";

// Function to normalize and standardize tags
export function normalizeAndStandardizeTags(rawTags: string[]): string[] {
  const normalizedTags = new Set<string>();
  
  rawTags.forEach(tag => {
    // Clean up the tag
    const cleanTag = tag.toLowerCase().trim();
    
    // Check if it has a direct mapping
    if (TAG_NORMALIZATION_MAP[cleanTag]) {
      normalizedTags.add(TAG_NORMALIZATION_MAP[cleanTag]);
      return;
    }
    
    // Check if it's already a standard tag
    if (STANDARD_MEDICINAL_TAGS.includes(cleanTag)) {
      normalizedTags.add(cleanTag);
      return;
    }
    
    // Try to find partial matches for compound variations
    const normalizedTag = findBestTagMatch(cleanTag);
    if (normalizedTag) {
      normalizedTags.add(normalizedTag);
      return;
    }
    
    // If no match found, keep the original but cleaned up
    if (cleanTag && cleanTag.length > 2) {
      normalizedTags.add(cleanTag.replace(/[^a-z0-9\-]/g, '-').replace(/-+/g, '-'));
    }
  });
  
  return Array.from(normalizedTags);
}

// Function to find the best matching standard tag
function findBestTagMatch(tag: string): string | null {
  // Look for key words that might indicate a standard tag
  const keywordMappings: { [key: string]: string } = {
    'immune': 'immune-support',
    'inflammat': 'anti-inflammatory',
    'pain': 'pain-relief',
    'digest': 'digestive-aid',
    'stomach': 'stomach-soothing',
    'stress': 'stress-relief',
    'anxiety': 'anxiety-relief',
    'sleep': 'sleep-aid',
    'skin': 'skin-soothing',
    'wound': 'wound-healing',
    'respiratory': 'respiratory-support',
    'lung': 'respiratory-support',
    'cough': 'cough-suppressant',
    'heart': 'heart-support',
    'circulation': 'circulation-improvement',
    'memory': 'memory-support',
    'brain': 'memory-support',
    'energy': 'energy-boost',
    'antioxidant': 'antioxidant',
    'detox': 'detoxification',
    'liver': 'liver-support',
    'kidney': 'kidney-support',
    'blood': 'circulation-improvement',
  };
  
  for (const [keyword, standardTag] of Object.entries(keywordMappings)) {
    if (tag.includes(keyword)) {
      return standardTag;
    }
  }
  
  return null;
}

// Helper function to fetch plant images from web
export async function fetchPlantImageFromWeb(scientificName: string): Promise<string> {
  try {
    console.log(`🖼️ Fetching image for: ${scientificName}`);
    
    // Try multiple sources for plant images
    const imageSources = [
      // Wikipedia/Wikimedia Commons API
      async () => await fetchFromWikipedia(scientificName),
      // iNaturalist (high quality botanical images)
      async () => await fetchFromiNaturalist(scientificName),
      // Improved Unsplash search
      async () => await fetchFromUnsplash(scientificName),
    ];

    // Try each source in order until we get a valid image
    for (const fetchFunction of imageSources) {
      try {
        const imageUrl = await fetchFunction();
        if (imageUrl) {
          return imageUrl;
        }
      } catch (error) {
        console.log(`⚠️ Image source failed:`, error);
        continue;
      }
    }

    // Fallback to a generic plant placeholder
    return `https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&h=300&fit=crop&crop=center`;
  } catch (error) {
    console.error(`❌ Error fetching image for ${scientificName}:`, error);
    return "";
  }
}

// Enhanced function to fetch multiple diverse images for a plant species
export async function fetchMultiplePlantImages(scientificName: string): Promise<string[]> {
  const images: string[] = [];
  
  try {
    console.log(`🖼️ Fetching multiple images for: ${scientificName}`);
    
    // Get images from different sources in parallel
    const imagePromises = [
      fetchFromWikipedia(scientificName),
      fetchFromiNaturalist(scientificName),
      fetchFromUnsplash(scientificName),
      fetchAdditionalUnsplashImages(scientificName), // Get multiple Unsplash variants
    ];

    const results = await Promise.allSettled(imagePromises);
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value) {
        images.push(result.value);
      }
    });

    // Remove duplicates and limit to 6 diverse images
    const uniqueImages = [...new Set(images)].slice(0, 6);
    
    console.log(`📸 Collected ${uniqueImages.length} diverse images for ${scientificName}`);
    return uniqueImages;
    
  } catch (error) {
    console.error(`❌ Error fetching multiple images for ${scientificName}:`, error);
    return [];
  }
}

// Fetch from Wikipedia/Wikimedia Commons
async function fetchFromWikipedia(scientificName: string): Promise<string> {
  try {
    // Wikipedia API to get page info
    const wikiResponse = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(scientificName)}`
    );
    
    if (wikiResponse.ok) {
      const wikiData = await wikiResponse.json();
      if (wikiData.thumbnail?.source) {
        // Get higher resolution version
        const highResUrl = wikiData.thumbnail.source.replace(/\/\d+px-/, '/400px-');
        return highResUrl;
      }
    }

    // Alternative: Use Wikimedia Commons API
    const commonsResponse = await fetch(
      `https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=pageimages&titles=${encodeURIComponent(scientificName)}&pithumbsize=400&origin=*`
    );
    
    if (commonsResponse.ok) {
      const commonsData = await commonsResponse.json();
      const pages = commonsData.query?.pages;
      if (pages) {
        const pageId = Object.keys(pages)[0];
        const thumbnail = pages[pageId]?.thumbnail?.source;
        if (thumbnail) {
          return thumbnail;
        }
      }
    }

    return "";
  } catch (error) {
    console.log(`Wikipedia fetch failed for ${scientificName}:`, error);
    return "";
  }
}

// Fetch from iNaturalist (using their public endpoints)
async function fetchFromiNaturalist(scientificName: string): Promise<string> {
  try {
    // iNaturalist has a public API for species data
    const response = await fetch(
      `https://api.inaturalist.org/v1/taxa?q=${encodeURIComponent(scientificName)}&is_active=true&rank=species&per_page=1`
    );
    
    if (response.ok) {
      const data = await response.json();
      const taxon = data.results?.[0];
      if (taxon?.default_photo?.medium_url) {
        return taxon.default_photo.medium_url;
      }
      // Try square photo for consistency
      if (taxon?.default_photo?.square_url) {
        return taxon.default_photo.square_url;
      }
    }

    return "";
  } catch (error) {
    console.log(`iNaturalist fetch failed for ${scientificName}:`, error);
    return "";
  }
}

// Improved Unsplash search with better keywords
async function fetchFromUnsplash(scientificName: string): Promise<string> {
  try {
    const genus = scientificName.split(' ')[0];
    const species = scientificName.split(' ')[1];
    
    // Try different search strategies
    const searchTerms = [
      `${scientificName} plant botanical`,
      `${genus} ${species} flower`,
      `${genus} plant species`,
      `${genus} botanical illustration`,
    ];

    for (const searchTerm of searchTerms) {
      const encodedTerm = encodeURIComponent(searchTerm.replace(/\s+/g, '+'));
      const url = `https://source.unsplash.com/400x300/?${encodedTerm}`;
      
      // Test if the URL returns a valid image
      try {
        const testResponse = await fetch(url, { method: 'HEAD' });
        if (testResponse.ok) {
          return url;
        }
      } catch (testError) {
        continue;
      }
    }

    return "";
  } catch (error) {
    console.log(`Unsplash fetch failed for ${scientificName}:`, error);
    return "";
  }
}

// Fetch additional Unsplash images with different search terms for variety
async function fetchAdditionalUnsplashImages(scientificName: string): Promise<string> {
  try {
    const genus = scientificName.split(' ')[0];
    const species = scientificName.split(' ')[1];
    
    // Try more specific search terms for additional variety
    const searchTerms = [
      `${genus} ${species} leaf closeup`,
      `${genus} ${species} habitat natural`,
      `${scientificName} botanical garden`,
      `${genus} plant identification guide`,
      `${species} ${genus} wild native`,
    ];

    for (const searchTerm of searchTerms) {
      const encodedTerm = encodeURIComponent(searchTerm.replace(/\s+/g, '+'));
      const url = `https://source.unsplash.com/400x300/?${encodedTerm}`;
      
      try {
        const testResponse = await fetch(url, { method: 'HEAD' });
        if (testResponse.ok) {
          return url;
        }
      } catch (testError) {
        continue;
      }
    }

    return "";
  } catch (error) {
    console.log(`Additional Unsplash fetch failed for ${scientificName}:`, error);
    return "";
  }
} 