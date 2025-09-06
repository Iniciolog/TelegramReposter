import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";
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

const formSchema = insertChannelPairSchema.omit({
  sourceName: true,
  targetName: true,
  sourceSubscribers: true,
  targetSubscribers: true,
}).extend({
  removeChannelMentions: z.boolean().optional(),
  removeExternalLinks: z.boolean().optional(),
  addWatermark: z.boolean().optional(),
});

type FormData = z.infer<typeof formSchema>;

export function QuickSetup() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  
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
      copyMode: "auto",
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
    console.log('Form submitted with data:', data);
    console.log('Form errors:', errors);
    createChannelPairMutation.mutate(data);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('setup.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit, (errors) => {
          console.log('Form validation errors:', errors);
        })}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="sourceUsername">{t('setup.source-channel')}</Label>
                <div className="relative">
                  <Input
                    id="sourceUsername"
                    placeholder="@любой_публичный_канал"
                    {...register("sourceUsername")}
                    data-testid="input-source-channel"
                  />
                  <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Можно указать любой публичный канал. Права администратора не требуются.
                </p>
                {errors.sourceUsername && (
                  <p className="text-sm text-destructive mt-1">
                    {errors.sourceUsername.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="targetUsername">{t('setup.target-channel')}</Label>
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
                <Label htmlFor="postingDelay">{t('setup.posting-delay')}</Label>
                <Select 
                  value={watch("postingDelay")?.toString()} 
                  onValueChange={(value) => setValue("postingDelay", parseInt(value))}
                >
                  <SelectTrigger data-testid="select-posting-delay">
                    <SelectValue placeholder={t('setup.select-delay')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">{t('setup.instant')}</SelectItem>
                    <SelectItem value="5">5 {t('setup.minutes')}</SelectItem>
                    <SelectItem value="15">15 {t('setup.minutes')}</SelectItem>
                    <SelectItem value="30">30 {t('setup.minutes')}</SelectItem>
                    <SelectItem value="60">1 {t('setup.hour')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="copyMode">Режим копирования</Label>
                <Select 
                  value={watch("copyMode")} 
                  onValueChange={(value) => setValue("copyMode", value as "auto" | "draft" | "both")}
                >
                  <SelectTrigger data-testid="select-copy-mode">
                    <SelectValue placeholder="Выберите режим копирования" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Автопубликация</SelectItem>
                    <SelectItem value="draft">Только черновики</SelectItem>
                    <SelectItem value="both">Автопубликация + черновики</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Автопубликация - посты публикуются автоматически. Черновики - посты сохраняются для ручного редактирования.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label>{t('setup.content-filters')}</Label>
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
                      {t('setup.remove-mentions')}
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
                      {t('setup.remove-links')}
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
                      {t('setup.add-watermark')}
                    </Label>
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="customBranding">{t('setup.custom-branding')}</Label>
                <Textarea
                  id="customBranding"
                  placeholder={t('setup.footer-placeholder')}
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
              {t('setup.save-draft')}
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting}
              data-testid="button-create-pair"
              onClick={() => console.log('Button clicked!')}
            >
              {isSubmitting ? (
                t('setup.creating')
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  {t('setup.create-pair')}
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
