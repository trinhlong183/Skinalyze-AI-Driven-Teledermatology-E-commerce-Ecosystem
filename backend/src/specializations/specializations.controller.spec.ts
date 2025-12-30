import { Test, TestingModule } from '@nestjs/testing';
import { SpecializationsController } from './specializations.controller';
import { SpecializationsService } from './specializations.service';

describe('SpecializationsController', () => {
  let controller: SpecializationsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SpecializationsController],
      providers: [SpecializationsService],
    }).compile();

    controller = module.get<SpecializationsController>(SpecializationsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
