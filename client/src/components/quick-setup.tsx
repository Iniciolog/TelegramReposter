import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertChannelPairSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { Plus, Search } from "lucide-react";

const formSchema = insertChannelPairSchema.extend({
  removeChannelMentions: z.boolean().optional(),
  removeExternalLinks: z.boolean().optional(),
  addWatermark: z.boolean().optional(),
});

type FormData = z.infer<typeof formSchema>;

export function QuickSetup() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      postingDelay: 0,
      status: "active",
      contentFilters: {},
      removeChannelMentions: true,
      removeExternalLinks: true,
      addWatermark: false,
    },
  });

  const createChannelPairMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const { removeChannelMentions, removeExternalLinks, addWatermark, ...channelPairData } = data;
      
      const contentFilters = {
        removeChannelMentions,
        removeExternalLinks,
        addWatermark,
      };

      const response = await apiRequest("POST", "/api/channel-pairs", {
        ...channelPairData,
        contentFilters,
      });
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/channel-pairs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "Channel pair created successfully!",
        description: "Monitoring will begin shortly.",
      });
      reset();
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error creating channel pair",
        description: error.message || "Please check your inputs and try again.",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    createChannelPairMutation.mutate(data);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Setup</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="sourceUsername">Source Channel</Label>
                <div className="relative">
                  <Input
                    id="sourceUsername"
                    placeholder="@source_channel"
                    {...register("sourceUsername")}
                    data-testid="input-source-channel"
                  />
                  <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                </div>
                {errors.sourceUsername && (
                  <p className="text-sm text-destructive mt-1">
                    {errors.sourceUsername.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="targetUsername">Target Channel</Label>
                <div className="relative">
                  <Input
                    id="targetUsername"
                    placeholder="@target_channel"
                    {...register("targetUsername")}
                    data-testid="input-target-channel"
                  />
                  <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                </div>
                {errors.targetUsername && (
                  <p className="text-sm text-destructive mt-1">
                    {errors.targetUsername.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="postingDelay">Posting Delay</Label>
                <Select 
                  value={watch("postingDelay")?.toString()} 
                  onValueChange={(value) => setValue("postingDelay", parseInt(value))}
                >
                  <SelectTrigger data-testid="select-posting-delay">
                    <SelectValue placeholder="Select delay" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Instant</SelectItem>
                    <SelectItem value="5">5 minutes</SelectItem>
                    <SelectItem value="15">15 minutes</SelectItem>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="60">1 hour</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label>Content Filters</Label>
                <div className="space-y-3 mt-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="removeChannelMentions"
                      checked={watch("removeChannelMentions")}
                      onCheckedChange={(checked) => 
                        setValue("removeChannelMentions", !!checked)
                      }
                      data-testid="checkbox-remove-mentions"
                    />
                    <Label 
                      htmlFor="removeChannelMentions" 
                      className="text-sm font-normal"
                    >
                      Remove original channel mentions
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="removeExternalLinks"
                      checked={watch("removeExternalLinks")}
                      onCheckedChange={(checked) => 
                        setValue("removeExternalLinks", !!checked)
                      }
                      data-testid="checkbox-remove-links"
                    />
                    <Label 
                      htmlFor="removeExternalLinks" 
                      className="text-sm font-normal"
                    >
                      Remove external links
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="addWatermark"
                      checked={watch("addWatermark")}
                      onCheckedChange={(checked) => 
                        setValue("addWatermark", !!checked)
                      }
                      data-testid="checkbox-add-watermark"
                    />
                    <Label 
                      htmlFor="addWatermark" 
                      className="text-sm font-normal"
                    >
                      Add custom watermark to images
                    </Label>
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="customBranding">Custom Branding</Label>
                <Textarea
                  id="customBranding"
                  placeholder="Add your custom footer text..."
                  rows={3}
                  {...register("customBranding")}
                  data-testid="textarea-custom-branding"
                />
                {errors.customBranding && (
                  <p className="text-sm text-destructive mt-1">
                    {errors.customBranding.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end mt-6 space-x-3">
            <Button 
              type="button" 
              variant="outline"
              data-testid="button-save-draft"
            >
              Save as Draft
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting}
              data-testid="button-create-pair"
            >
              {isSubmitting ? (
                "Creating..."
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Channel Pair
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
