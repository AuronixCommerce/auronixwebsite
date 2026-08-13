'use client';

import { useEffect, useState } from 'react';
import { SellerLayout } from '@/components/seller/seller-layout';
import { auth } from '@/lib/firebase';
import {
  getData,
  pushData,
  subscribeToList,
  getTimestamp,
} from '@/lib/firebase-db';
import { onAuthChange } from '@/lib/auth';
import type { UserProfile, SupportTicket } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { LoadingState, EmptyState, ErrorState } from '@/components/site/states';
import { TICKET_CATEGORIES } from '@/lib/constants';
import { Loader2, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

type SellerTicket = SupportTicket & {
  id: string;
  sellerUid: string;
  sellerEmail?: string;
};

export default function SellerSupportPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<SellerTicket[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [form, setForm] = useState({
    subject: '',
    category: '',
    message: '',
  });

  useEffect(() => {
    let unsubscribeTickets: (() => void) | undefined;

    const unsubscribeAuth = onAuthChange(async (firebaseUser) => {
      setLoading(true);
      setLoadError(null);

      try {
        if (!firebaseUser) {
          setProfile(null);
          setTickets([]);
          setLoading(false);
          return;
        }

        const userProfile = await getData<UserProfile>(
          `users/${firebaseUser.uid}`
        );

        if (!userProfile) {
          setProfile(null);
          setTickets([]);
          setLoading(false);
          return;
        }

        setProfile(userProfile);

        unsubscribeTickets = subscribeToList<SupportTicket>(
          'tickets',
          (data) => {
            const mine: SellerTicket[] = data
              .filter((ticket) => ticket.sellerUid === firebaseUser.uid)
              .map((ticket) => ({
                ...ticket,
                sellerUid: ticket.sellerUid as string,
                id: ticket.id,
              }));

            setTickets(mine);
          }
        );
      } catch (error) {
        console.error('Failed to load seller support:', error);

        setLoadError(
          'Unable to load your support tickets. Please refresh the page and try again.'
        );
      } finally {
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();

      if (unsubscribeTickets) {
        unsubscribeTickets();
      }
    };
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const currentUser = auth.currentUser;

    if (!currentUser || submitting) {
      return;
    }

    const subject = form.subject.trim();
    const category = form.category.trim();
    const message = form.message.trim();

    if (!subject || !category || !message) {
      toast({
        title: 'All fields are required',
        description: 'Please complete the subject, category, and message.',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);

    try {
      const now = getTimestamp();

      const ticket = {
        name: profile?.name || profile?.email || '',
        email: profile?.email || currentUser.email || '',
        sellerUid: currentUser.uid,
        sellerEmail: currentUser.email || profile?.email || '',
        category,
        subject,
        message,
        status: 'open',
        createdAt: now,
        updatedAt: now,
      };

      await pushData('tickets', ticket);

      toast({
        title: 'Ticket created',
        description: 'Your support ticket has been submitted successfully.',
      });

      setForm({
        subject: '',
        category: '',
        message: '',
      });

      setShowForm(false);
    } catch (error) {
      console.error('Failed to create seller ticket:', error);

      toast({
        title: 'Failed to create ticket',
        description:
          error instanceof Error
            ? error.message
            : 'Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SellerLayout>
        <LoadingState />
      </SellerLayout>
    );
  }

  if (loadError) {
    return (
      <SellerLayout>
        <ErrorState
          title="Unable to load support"
          description={loadError}
        />
      </SellerLayout>
    );
  }

  return (
    <SellerLayout>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight mb-2">
            Support
          </h1>

          <p className="text-sm text-foreground-muted">
            Create and track your support tickets.
          </p>
        </div>

        <Button
          type="button"
          onClick={() => setShowForm((current) => !current)}
        >
          <Plus className="w-4 h-4 mr-1.5" />
          {showForm ? 'Close Form' : 'New Ticket'}
        </Button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="max-w-xl space-y-5 rounded-2xl border border-border bg-card p-6 mb-8"
        >
          <div>
            <Label htmlFor="subject" className="mb-2 block">
              Subject
            </Label>

            <Input
              id="subject"
              value={form.subject}
              onChange={(event) =>
                setForm((previous) => ({
                  ...previous,
                  subject: event.target.value,
                }))
              }
              placeholder="What do you need help with?"
              maxLength={150}
              required
            />
          </div>

          <div>
            <Label htmlFor="category" className="mb-2 block">
              Category
            </Label>

            <Select
              value={form.category}
              onValueChange={(value) =>
                setForm((previous) => ({
                  ...previous,
                  category: value,
                }))
              }
            >
              <SelectTrigger id="category">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>

              <SelectContent>
                {TICKET_CATEGORIES.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="message" className="mb-2 block">
              Message
            </Label>

            <Textarea
              id="message"
              value={form.message}
              onChange={(event) =>
                setForm((previous) => ({
                  ...previous,
                  message: event.target.value,
                }))
              }
              placeholder="Describe your issue or question..."
              rows={6}
              maxLength={5000}
              required
            />
          </div>

          <Button type="submit" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating…
              </>
            ) : (
              'Create Ticket'
            )}
          </Button>
        </form>
      )}

      {tickets.length === 0 ? (
        <EmptyState
          title="No tickets yet."
          description="Create a ticket if you need help with your seller account."
        />
      ) : (
        <div className="space-y-3">
          {tickets.map((ticket) => (
            <div
              key={ticket.id}
              className="rounded-xl border border-border bg-card p-5"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-3">
                <h3 className="text-sm font-semibold">
                  {ticket.subject}
                </h3>

                <span
                  className={cn(
                    'w-fit text-xs px-2.5 py-1 rounded-full font-medium',
                    ticket.status === 'open' &&
                      'bg-blue-500/10 text-blue-600',
                    ticket.status === 'in-progress' &&
                      'bg-yellow-500/10 text-yellow-600',
                    ticket.status === 'resolved' &&
                      'bg-green-500/10 text-green-600',
                    ticket.status === 'closed' &&
                      'bg-secondary text-foreground-muted'
                  )}
                >
                  {ticket.status}
                </span>
              </div>

              <p className="text-sm text-foreground-muted line-clamp-3">
                {ticket.message}
              </p>

              <p className="text-xs text-foreground-muted mt-3">
                {ticket.category} ·{' '}
                {new Date(ticket.createdAt).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </SellerLayout>
  );
}
