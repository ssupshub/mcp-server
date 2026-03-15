import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IService {
  name: string;
  url: string;
  description?: string;
  tags: string[];
  metadata: Record<string, unknown>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type ServiceDocument = IService & Document;

const serviceSchema = new Schema<ServiceDocument>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: 2,
      maxlength: 100,
      index: true,
    },
    url: {
      type: String,
      required: [true, 'URL is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    tags: {
      type: [String],
      default: [],
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      transform(_doc, ret: Record<string, unknown>): Record<string, unknown> {
        ret['id'] = ret['_id'];
        ret['_id'] = undefined;
        return ret;
      },
    },
  },
);

// Text search index for name + description
serviceSchema.index({ name: 'text', description: 'text' });

// Ensure no two services share the same URL
serviceSchema.index({ url: 1 }, { unique: true });

export const ServiceModel: Model<ServiceDocument> = mongoose.model<ServiceDocument>(
  'Service',
  serviceSchema,
);
