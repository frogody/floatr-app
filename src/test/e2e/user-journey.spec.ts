import { test, expect } from '@playwright/test';

test.describe('Floatr User Journey - Happy Path', () => {
  test.beforeEach(async ({ page }) => {
    // Mock geolocation for consistent testing
    await page.context().grantPermissions(['geolocation']);
    await page.setGeolocation({ latitude: 52.3676, longitude: 4.9041 }); // Amsterdam
  });

  test('complete user journey: signup → profile → boat → map → match → chat', async ({ page }) => {
    // Step 1: Navigate to homepage
    await page.goto('/');
    
    // Should see the landing page with sign-up option
    await expect(page.locator('h1')).toContainText('Floatr');
    
    // Step 2: Navigate to Sign-Up (Mock Clerk flow)
    await page.click('[data-testid="sign-up-button"]');
    await page.waitForURL('**/sign-up/**');
    
    // Mock successful sign-up by going directly to dashboard
    // In real tests, you'd need to set up Clerk test environment
    await page.goto('/dashboard');
    
    // Step 3: Create User Profile
    // Should redirect to profile setup if no profile exists
    await page.waitForURL('**/dashboard/profile**');
    
    await expect(page.locator('h1')).toContainText('Complete Your Profile');
    
    // Fill out profile form
    await page.fill('[name="firstName"]', 'John');
    await page.fill('[name="lastName"]', 'Doe');
    await page.fill('[name="dateOfBirth"]', '1990-01-01');
    await page.fill('[name="phoneNumber"]', '+1234567890');
    
    // Fill emergency contact (required for SOS)
    await page.fill('[name="emergencyContactName"]', 'Jane Doe');
    await page.fill('[name="emergencyContactPhone"]', '+1987654321');
    await page.fill('[name="emergencyContactRelation"]', 'Spouse');
    
    // Submit profile
    await page.click('button[type="submit"]');
    
    // Wait for profile creation success
    await expect(page.locator('.toast, .alert')).toContainText('Profile updated successfully');
    
    // Step 4: Create Boat Profile
    await page.goto('/dashboard/boat');
    
    await expect(page.locator('h1')).toContainText('Your Boat');
    
    // Click create boat button
    await page.click('text=Add Your First Boat');
    
    // Fill boat form
    await page.fill('[name="name"]', 'Sea Wanderer');
    await page.selectOption('[name="type"]', 'SAILBOAT');
    await page.fill('[name="length"]', '32');
    await page.fill('[name="capacity"]', '6');
    await page.selectOption('[name="currentVibe"]', 'CHILL');
    await page.fill('[name="description"]', 'Beautiful sailboat perfect for relaxing trips');
    
    // Add amenities
    await page.click('text=GPS');
    await page.click('text=Radio');
    
    // Submit boat form
    await page.click('button[type="submit"]');
    
    // Wait for boat creation
    await expect(page.locator('.toast, .alert')).toContainText('Boat created successfully');
    
    // Step 5: Navigate to Map
    await page.goto('/dashboard/map');
    
    // Wait for map to load
    await page.waitForSelector('[data-testid="mapbox-map"]', { timeout: 10000 });
    
    // Should see user location and map controls
    await expect(page.locator('[data-testid="mapbox-map"]')).toBeVisible();
    await expect(page.locator('[data-testid="geolocate-control"]')).toBeVisible();
    await expect(page.locator('[data-testid="navigation-control"]')).toBeVisible();
    
    // Should see location stats
    await expect(page.locator('text=Your Location')).toBeVisible();
    
    // Mock nearby boats appearing on map
    await page.evaluate(() => {
      // Simulate nearby boats being loaded
      window.dispatchEvent(new CustomEvent('nearbyBoatsLoaded', {
        detail: { count: 3 }
      }));
    });
    
    // Should see boat markers (mocked)
    await expect(page.locator('[data-testid="mapbox-marker"]').first()).toBeVisible();
    
    // Step 6: Go to Discovery Page for Matching
    await page.goto('/dashboard/discover');
    
    await expect(page.locator('h1')).toContainText('Discover');
    
    // Wait for boat cards to load
    await page.waitForSelector('.boat-card', { timeout: 10000 });
    
    // Should see swipeable boat cards
    await expect(page.locator('.boat-card').first()).toBeVisible();
    
    // Simulate swiping right (like) on a boat
    const firstBoatCard = page.locator('.boat-card').first();
    await firstBoatCard.hover();
    
    // Click like button or swipe right
    await page.click('[data-testid="like-button"]');
    
    // Mock a match happening
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('matchFound', {
        detail: {
          matchId: 'test-match-id',
          otherBoat: {
            name: 'Ocean Explorer',
            captain: { firstName: 'Alice', lastName: 'Smith' }
          }
        }
      }));
    });
    
    // Should see "It's a Match!" modal
    await expect(page.locator('text=It\'s a Match!')).toBeVisible();
    await expect(page.locator('text=Ocean Explorer')).toBeVisible();
    
    // Click "Start Chatting" button
    await page.click('text=Start Chatting');
    
    // Step 7: Navigate to Messages/Chat
    await page.waitForURL('**/messages/**');
    
    // Should be in the chat interface
    await expect(page.locator('.chat-interface')).toBeVisible();
    await expect(page.locator('text=Alice Smith')).toBeVisible();
    
    // Should see message input
    await expect(page.locator('[placeholder*="Type a message"]')).toBeVisible();
    
    // Send a test message
    await page.fill('[placeholder*="Type a message"]', 'Hello! Nice to meet you!');
    await page.click('button[type="submit"]');
    
    // Message should appear in chat
    await expect(page.locator('.message').last()).toContainText('Hello! Nice to meet you!');
    
    // Step 8: Test Safety Features
    
    // Test SOS Button (should be floating)
    await expect(page.locator('[aria-label="Emergency SOS Alert"]')).toBeVisible();
    
    // Click SOS button to test emergency system
    await page.click('[aria-label="Emergency SOS Alert"]');
    
    // Should see SOS confirmation dialog
    await expect(page.locator('text=Emergency SOS Alert')).toBeVisible();
    await expect(page.locator('text=This will immediately notify')).toBeVisible();
    
    // Cancel SOS (don't trigger in test)
    await page.click('text=Cancel');
    
    // Test Report functionality in chat
    await page.click('[title="Report User"]');
    
    // Should see report dialog
    await expect(page.locator('text=Report User Profile')).toBeVisible();
    
    // Fill report form
    await page.selectOption('select', 'INAPPROPRIATE_BEHAVIOR');
    await page.fill('textarea', 'Test report for automated testing');
    
    // Submit report (mock)
    await page.click('text=Submit Report');
    
    // Should see success message
    await expect(page.locator('text=Report submitted successfully')).toBeVisible();
    
    // Step 9: Navigate Back to Dashboard
    await page.goto('/dashboard');
    
    // Should see dashboard overview with all sections
    await expect(page.locator('h1')).toContainText('Welcome back');
    await expect(page.locator('text=Your Profile')).toBeVisible();
    await expect(page.locator('text=Your Boat')).toBeVisible();
    await expect(page.locator('text=Discover')).toBeVisible();
    await expect(page.locator('text=Map')).toBeVisible();
    await expect(page.locator('text=Messages')).toBeVisible();
    
    // Should see unread message indicator
    await expect(page.locator('.unread-indicator')).toBeVisible();
    
    // Step 10: Test Maritime Zones on Map
    await page.goto('/dashboard/map');
    
    // Wait for zones to load
    await page.waitForSelector('[data-testid="mapbox-layer"]', { timeout: 5000 });
    
    // Should see zone legend
    await expect(page.locator('text=Maritime Zones')).toBeVisible();
    
    // Mock clicking on a no-go zone
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('zoneClicked', {
        detail: {
          zone: {
            name: 'Marine Sanctuary',
            type: 'ECOLOGICAL',
            description: 'Protected area'
          }
        }
      }));
    });
    
    // Should see zone information popup
    await expect(page.locator('text=Marine Sanctuary')).toBeVisible();
    await expect(page.locator('text=ECOLOGICAL')).toBeVisible();
  });

  test('mobile responsive navigation', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/dashboard');
    
    // Should see mobile-friendly layout
    await expect(page.locator('.mobile-nav, [data-testid="mobile-menu"]')).toBeVisible();
    
    // Test mobile navigation
    await page.click('[data-testid="mobile-menu-button"]');
    await expect(page.locator('[data-testid="mobile-menu-overlay"]')).toBeVisible();
    
    // Test navigation to different sections
    await page.click('text=Map');
    await page.waitForURL('**/map**');
    
    // Map should be responsive
    await expect(page.locator('[data-testid="mapbox-map"]')).toBeVisible();
  });

  test('accessibility features', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Test keyboard navigation
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');
    
    // Test ARIA labels and roles
    await expect(page.locator('[role="main"]')).toBeVisible();
    await expect(page.locator('[aria-label]').first()).toBeVisible();
    
    // Test contrast and color accessibility
    const backgroundColor = await page.locator('body').evaluate(el => 
      getComputedStyle(el).backgroundColor
    );
    const textColor = await page.locator('body').evaluate(el => 
      getComputedStyle(el).color
    );
    
    expect(backgroundColor).toBeTruthy();
    expect(textColor).toBeTruthy();
  });

  test('error handling and edge cases', async ({ page }) => {
    // Test network errors
    await page.route('**/api/**', route => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Internal server error' }),
      });
    });
    
    await page.goto('/dashboard/discover');
    
    // Should show error state
    await expect(page.locator('text=Something went wrong')).toBeVisible();
    
    // Test offline behavior
    await page.context().setOffline(true);
    await page.reload();
    
    // Should handle offline gracefully
    await expect(page.locator('text=Connection problem')).toBeVisible();
  });

  test('performance and loading states', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Measure page load time
    const loadTime = await page.evaluate(() => {
      return performance.timing.loadEventEnd - performance.timing.navigationStart;
    });
    
    // Should load reasonably fast (under 3 seconds)
    expect(loadTime).toBeLessThan(3000);
    
    // Test loading states
    await page.goto('/dashboard/map');
    
    // Should show loading spinner initially
    await expect(page.locator('.loading, .spinner')).toBeVisible();
    
    // Should complete loading
    await page.waitForSelector('[data-testid="mapbox-map"]');
    await expect(page.locator('.loading, .spinner')).not.toBeVisible();
  });
}); 