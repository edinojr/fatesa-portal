import { useEffect } from 'react';

interface SEOProps {
  title?: string;
  description?: string;
}

export function useSEO({ title, description }: SEOProps) {
  useEffect(() => {
    if (title) {
      document.title = title;
    }

    if (description) {
      // Find existing meta description
      let metaDescription = document.querySelector('meta[name="description"]');
      
      if (metaDescription) {
        metaDescription.setAttribute('content', description);
      } else {
        // Create one if it doesn't exist
        metaDescription = document.createElement('meta');
        metaDescription.setAttribute('name', 'description');
        metaDescription.setAttribute('content', description);
        document.head.appendChild(metaDescription);
      }
    }

    // Cleanup isn't strictly necessary for global SEO on SPAs unless we want to revert,
    // but typically the default tags in index.html suffice as a fallback base if navigating away.
  }, [title, description]);
}
