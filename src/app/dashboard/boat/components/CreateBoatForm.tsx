'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form';
import { 
  Select,
  SelectContent,  
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const boatSchema = z.object({
  name: z.string().min(2, 'Boat name must be at least 2 characters'),
  type: z.enum(['SAILBOAT', 'MOTORBOAT', 'YACHT', 'CATAMARAN', 'SPEEDBOAT', 'OTHER'], {
    required_error: 'Please select a boat type',
  }),
  length: z.number().min(1, 'Length must be at least 1 meter').max(200, 'Length must be less than 200 meters').optional(),
  capacity: z.number().min(1, 'Capacity must be at least 1 person').max(50, 'Capacity must be less than 50 people'),
  currentVibe: z.enum(['PARTY', 'CHILL', 'PRIVATE', 'FAMILY', 'ADVENTURE'], {
    required_error: 'Please select a vibe',
  }),
  description: z.string().max(1000, 'Description must be less than 1000 characters').optional(),
  amenities: z.array(z.string()).optional(),
});

type BoatFormData = z.infer<typeof boatSchema>;

const boatTypes = [
  { value: 'SAILBOAT', label: '⛵ Sailboat' },
  { value: 'MOTORBOAT', label: '🚤 Motorboat' },
  { value: 'YACHT', label: '🛥️ Yacht' },
  { value: 'CATAMARAN', label: '⛵ Catamaran' },
  { value: 'SPEEDBOAT', label: '💨 Speedboat' },
  { value: 'OTHER', label: '🚢 Other' },
];

const boatVibes = [
  { value: 'PARTY', label: '🎉 Party', description: 'High-energy, music, celebrations' },
  { value: 'CHILL', label: '😌 Chill', description: 'Relaxed, peaceful, laid-back' },
  { value: 'PRIVATE', label: '🔒 Private', description: 'Intimate, close friends/family' },
  { value: 'FAMILY', label: '👨‍👩‍👧‍👦 Family', description: 'Family-friendly, all ages welcome' },
  { value: 'ADVENTURE', label: '🗺️ Adventure', description: 'Exploration, activities, excitement' },
];

const commonAmenities = [
  'Wi-Fi', 'Kitchen/Galley', 'Bathroom', 'Shower', 'Air Conditioning', 'Sound System',
  'TV/Entertainment', 'Fishing Equipment', 'Snorkeling Gear', 'Water Sports Equipment',
  'BBQ/Grill', 'Sun Deck', 'Shade Area', 'Storage', 'Safety Equipment', 'Navigation System'
];

export function CreateBoatForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>(['']);

  const form = useForm<BoatFormData>({
    resolver: zodResolver(boatSchema),
    defaultValues: {
      name: '',
      type: undefined,
      length: undefined,
      capacity: 4,
      currentVibe: undefined,
      description: '',
      amenities: [],
    },
  });

  const onSubmit = async (data: BoatFormData) => {
    setIsLoading(true);
    
    try {
      const payload = {
        ...data,
        amenities: selectedAmenities,
        images: imageUrls.filter(url => url.trim() !== ''),
      };

      const response = await fetch('/api/boats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create boat');
      }

      // Success - redirect or refresh
      router.refresh();
      
      // Reset form
      form.reset();
      setSelectedAmenities([]);
      setImageUrls(['']);
      
    } catch (error) {
      console.error('Error creating boat:', error);
      // You might want to show an error toast here
    } finally {
      setIsLoading(false);
    }
  };

  const toggleAmenity = (amenity: string) => {
    setSelectedAmenities(prev => 
      prev.includes(amenity)
        ? prev.filter(a => a !== amenity)
        : [...prev, amenity]
    );
  };

  const addImageUrl = () => {
    setImageUrls(prev => [...prev, '']);
  };

  const updateImageUrl = (index: number, url: string) => {
    setImageUrls(prev => prev.map((current, i) => i === index ? url : current));
  };

  const removeImageUrl = (index: number) => {
    setImageUrls(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Boat Name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Sea Breeze, Ocean Dream" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Boat Type</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select boat type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {boatTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="length"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Length (meters) - Optional</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    placeholder="e.g., 12.5"
                    {...field}
                    onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                  />
                </FormControl>
                <FormDescription>
                  Length of your boat in meters
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="capacity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Maximum Capacity</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    placeholder="e.g., 8"
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                  />
                </FormControl>
                <FormDescription>
                  Maximum number of people your boat can safely accommodate
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Boat Vibe */}
        <FormField
          control={form.control}
          name="currentVibe"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Boat Vibe</FormLabel>
              <FormDescription>
                What's the typical atmosphere on your boat?
              </FormDescription>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
                {boatVibes.map((vibe) => (
                  <div
                    key={vibe.value}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      field.value === vibe.value 
                        ? 'border-primary bg-primary/10' 
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => field.onChange(vibe.value)}
                  >
                    <div className="font-medium text-sm">{vibe.label}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {vibe.description}
                    </div>
                  </div>
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Description */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Describe your boat, typical outings, and what makes it special..."
                  className="resize-none"
                  rows={4}
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Help potential crew members understand what to expect
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Boat Images */}
        <div className="space-y-3">
          <Label>Boat Images (Optional)</Label>
          <p className="text-sm text-muted-foreground">
            Add URLs to photos of your boat
          </p>
          {imageUrls.map((url, index) => (
            <div key={index} className="flex gap-2">
              <Input
                placeholder="https://example.com/boat-photo.jpg"
                value={url}
                onChange={(e) => updateImageUrl(index, e.target.value)}
              />
              {imageUrls.length > 1 && (
                <Button 
                  type="button"
                  variant="outline" 
                  size="sm"
                  onClick={() => removeImageUrl(index)}
                >
                  Remove
                </Button>
              )}
            </div>
          ))}
          <Button 
            type="button"
            variant="outline" 
            size="sm"
            onClick={addImageUrl}
          >
            + Add Another Photo
          </Button>
        </div>

        {/* Amenities */}
        <div className="space-y-3">
          <Label>Amenities (Optional)</Label>
          <p className="text-sm text-muted-foreground">
            Select the amenities available on your boat
          </p>
          <div className="flex flex-wrap gap-2">
            {commonAmenities.map((amenity) => (
              <Badge
                key={amenity}
                variant={selectedAmenities.includes(amenity) ? "default" : "outline"}
                className="cursor-pointer hover:bg-primary/80"
                onClick={() => toggleAmenity(amenity)}
              >
                {amenity}
              </Badge>
            ))}
          </div>
          {selectedAmenities.length > 0 && (
            <div className="mt-2">
              <p className="text-sm text-muted-foreground">Selected amenities:</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {selectedAmenities.map((amenity) => (
                  <Badge key={amenity} variant="secondary" className="text-xs">
                    {amenity}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Submit Button */}
        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading ? 'Creating...' : 'Create Boat Profile'}
        </Button>
      </form>
    </Form>
  );
} 